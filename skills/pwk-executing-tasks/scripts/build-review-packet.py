#!/usr/bin/env python3
"""Build review evidence from explicit, immutable Git bounds. Python 3.9+, stdlib only."""

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


class PacketError(Exception):
    pass


class Document:
    """Keep original lines for evidence; inspect headings only outside fenced examples."""

    def __init__(self, path):
        with path.open(encoding='utf-8', newline='') as source:
            self.lines = source.readlines()
        self.headings = []
        self.visible = set()
        fence = None
        for index, line in enumerate(self.lines):
            marker = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', line.rstrip('\r\n'))
            if fence:
                if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence) and not marker[2].strip():
                    fence = None
                continue
            if marker:
                fence = marker[1]
                continue
            self.visible.add(index)
            heading = re.match(r'^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$', line.rstrip('\r\n'))
            if heading:
                self.headings.append((index, len(heading[1]), heading[2]))
        if fence:
            raise PacketError(f'{path.name}: unclosed code fence')

    def section(self, title, level=2, required=False):
        matches = [h for h in self.headings if h[1:] == (level, title)]
        if len(matches) > 1 or (required and not matches):
            raise PacketError(f'expected one {title} section; found {len(matches)}')
        if not matches:
            return None
        start = matches[0][0]
        end = next((i for i, depth, _ in self.headings if i > start and depth <= level), len(self.lines))
        return start, end

    def text(self, start, end):
        return ''.join(self.lines[start:end])


def git(project, *args):
    result = subprocess.run(
        ['git', '-C', str(project), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0', 'GIT_TERMINAL_PROMPT': '0'},
    )
    if result.returncode:
        invocation = ' '.join(['git', *args])
        raise PacketError(f'{invocation} failed: {result.stderr.decode("utf-8", errors="replace").strip()}')
    return result.stdout.decode('utf-8', errors='replace')


def resolve_input(project, value):
    path = Path(value)
    return (path if path.is_absolute() else project / path).resolve(strict=True)


def paths(args):
    project = Path(args.project).resolve(strict=True)
    if Path(git(project, 'rev-parse', '--show-toplevel').strip()).resolve() != project:
        raise PacketError('--project must be the Git worktree root')
    for value in (args.design, args.progress):
        supplied = Path(value)
        supplied = Path(os.path.abspath(supplied if supplied.is_absolute() else project / supplied))
        lexical_project = Path(os.path.abspath(args.project))
        try:
            relative_input = supplied.relative_to(lexical_project)
        except ValueError:
            relative_input = supplied.relative_to(project)
        current = project
        for part in relative_input.parts:
            current = current / part
            if current.is_symlink():
                raise PacketError('design/progress paths must not traverse symlinks')
    design = resolve_input(project, args.design)
    progress = resolve_input(project, args.progress)
    relative = design.relative_to(project / 'docs' / 'plans')
    if len(relative.parts) != 2 or relative.parts[0] == 'completed' or not design.name.endswith('-design.md'):
        raise PacketError('design must be docs/plans/<topic>/<leaf>-design.md in an active topic')
    leaf = design.name[:-len('-design.md')]
    if not leaf or progress != design.with_name(f'{leaf}-progress.md'):
        raise PacketError('progress must be the matching <leaf>-progress.md beside the design')
    # Resolving inputs must not route a packet write through symlinked topic directories.
    lexical_topic = project / 'docs' / 'plans' / relative.parts[0]
    for directory in (project / 'docs', project / 'docs' / 'plans', lexical_topic):
        if directory.is_symlink():
            raise PacketError('symlink topic directories are not writable packet destinations')
    suffix = '' if args.scope == 'feature' else f'-r{args.requirement}'
    destination = design.with_name(f'{leaf}-review-packet{suffix}.md')
    validate_destination(destination)
    return project, design, progress, destination


def validate_destination(path):
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise PacketError('packet destination must be a regular file, not a symlink or directory')


def requirements(document):
    region = document.section('Requirements', required=True)
    headings = []
    for index, depth, title in document.headings:
        match = re.match(r'^R([1-9][0-9]*):\s*\S', title)
        if depth == 3 and re.match(r'^R[0-9]', title) and not match:
            raise PacketError('malformed requirement heading')
        if depth == 3 and match:
            if not region[0] < index < region[1]:
                raise PacketError('requirement heading outside Requirements section')
            headings.append((int(match[1]), index))
    numbers = [number for number, _ in headings]
    if not numbers or len(set(numbers)) != len(numbers):
        raise PacketError('missing or duplicate requirement headings')
    return headings, region


def progress_rows(document, project, design):
    first_heading = next((i for i, depth, _ in document.headings if depth == 2), len(document.lines))
    pointers = [document.lines[i].strip()[8:] for i in document.visible
                if i < first_heading and document.lines[i].startswith('Design: ')]
    if len(pointers) != 1 or resolve_input(project, pointers[0]) != design:
        raise PacketError('progress Design header must identify the selected design exactly once')
    start, end = document.section('Requirements', required=True)
    lines = [document.lines[i].strip() for i in range(start + 1, end)
             if i in document.visible and document.lines[i].strip()]
    if len(lines) < 3:
        raise PacketError('missing Requirements table')

    def cells(line):
        if not line.startswith('|') or not line.endswith('|'):
            raise PacketError('malformed Requirements table row')
        return [cell.strip() for cell in re.split(r'(?<!\\)\|', line)[1:-1]]

    header = cells(lines[0])
    if header != ['#', 'Done', 'Requirement', 'Per-req ceremony', 'Commit']:
        raise PacketError('Requirements table must have #, Done, Requirement, Per-req ceremony, Commit columns')
    separator = cells(lines[1])
    if len(separator) != 5 or not all(re.fullmatch(r':?-+:?', cell) for cell in separator):
        raise PacketError('malformed Requirements table separator')
    rows = {}
    for line in lines[2:]:
        row = cells(line)
        if len(row) != 5 or not re.fullmatch(r'[1-9][0-9]*', row[0]):
            raise PacketError('malformed Requirements table row')
        number = int(row[0])
        if number in rows:
            raise PacketError(f'duplicate R{number} progress row')
        if row[1] not in ('', '⬜', '🔄', '✅', '❌', '⏭'):
            raise PacketError(f'R{number}: invalid Done cell')
        rows[number] = row
    return rows


def bounds(project, rows, headings, args):
    numbers = [number for number, _ in headings]
    position = numbers.index(args.requirement) if args.scope == 'requirement' else None
    relevant = numbers if position is None else numbers[max(0, position - 1):position + 1]
    if set(rows) - set(numbers):
        raise PacketError('progress contains requirements absent from the design')
    recorded = {}
    previous = None
    current_head = git(project, 'rev-parse', '--verify', 'HEAD^{commit}').strip()
    for number in relevant:
        if number not in rows:
            raise PacketError(f'R{number}: missing progress row')
        row = rows[number]
        value = row[4]
        if value in ('', '—', '-'):
            if row[1] not in ('❌', '⏭'):
                raise PacketError(f'R{number}: missing Commit entry')
            recorded[number] = []
            continue
        # An ordered whitespace-separated list supports review-fix commits without losing
        # the first feature commit. Other formats are ambiguous, never mined for hashes.
        entries = value.split()
        if not all(re.fullmatch(r'[0-9a-fA-F]{7,64}', entry) for entry in entries):
            raise PacketError(f'R{number}: Commit must contain only ordered hexadecimal commit IDs')
        commits = []
        for entry in entries:
            commit = git(project, 'rev-parse', '--verify', f'{entry}^{{commit}}').strip()
            if previous:
                if previous == commit:
                    raise PacketError('duplicate or overlapping recorded commits')
                git(project, 'merge-base', '--is-ancestor', previous, commit)
            git(project, 'merge-base', '--is-ancestor', commit, current_head)
            commits.append(commit)
            previous = commit
        recorded[number] = commits
    if args.scope == 'feature':
        first = next((commits[0] for commits in recorded.values() if commits), None)
        if not first:
            raise PacketError('no recorded commits; cannot infer a feature base')
        return git(project, 'rev-parse', '--verify', f'{first}^').strip(), current_head
    selected = recorded[args.requirement]
    if not selected:
        raise PacketError('selected requirement has no recorded bound')
    if position == 0:
        base = git(project, 'rev-parse', '--verify', f'{selected[0]}^').strip()
    else:
        prior = recorded[numbers[position - 1]]
        if not prior:
            raise PacketError('previous requirement has no recorded bound; cannot guess a range')
        base = prior[-1]
    return base, selected[-1]


def evidence(document, headings, region, args):
    feature = document.section('Feature acceptance')
    if feature and feature[0] < region[1]:
        raise PacketError('Feature acceptance must follow Requirements')
    if args.scope == 'feature':
        start = headings[0][1]
        end = feature[0] if feature else len(document.lines)
    else:
        position = next(i for i, (number, _) in enumerate(headings) if number == args.requirement)
        start = headings[position][1]
        end = headings[position + 1][1] if position + 1 < len(headings) else region[1]
    criteria = document.text(start, end)
    acceptance = ''
    if feature:
        stop = next((i for i, depth, title in document.headings
                     if feature[0] < i < feature[1] and depth == 3 and title.startswith('Feature review:')), feature[1])
        acceptance = document.text(feature[0], stop)
    notes = []
    for index, depth, title in document.headings:
        if depth == 3 and title == 'Production-risk notes' and start <= index < end:
            stop = next((i for i, d, t in document.headings if i > index and
                         (d <= 2 or (d == 3 and re.match(r'^R[0-9]+:', t)))), len(document.lines))
            notes.append(document.text(index, min(stop, end)))
    risk = document.section('Production-risk areas')
    if risk:
        notes.append(document.text(*risk))
    return criteria, acceptance, ''.join(notes)


def build(args):
    project, design_path, progress_path, destination = paths(args)
    design = Document(design_path)
    headings, region = requirements(design)
    if args.scope == 'requirement' and args.requirement not in [n for n, _ in headings]:
        raise PacketError('selected requirement is absent from the design')
    rows = progress_rows(Document(progress_path), project, design_path)
    base, head = bounds(project, rows, headings, args)
    criteria, acceptance, notes = evidence(design, headings, region, args)
    span = f'{base}..{head}'
    pathspec = ['--', '.', ':(glob,exclude)**/*-review-packet*.md']
    sections = [
        ('Commits', git(project, 'log', '--oneline', '--no-decorate', span)),
        ('Changed files', git(project, 'diff', '--no-ext-diff', '--no-textconv', '--stat', span, *pathspec)),
        ('Acceptance criteria (verbatim from the design doc)', criteria),
        ('Feature acceptance (verbatim)', acceptance),
        ('Production-risk notes (verbatim, if any)', notes),
        ('Diff', git(project, 'diff', '--no-ext-diff', '--no-textconv', '--no-color', span, *pathspec)),
    ]
    label = 'feature review' if args.scope == 'feature' else f'requirement R{args.requirement} review'
    # The blank line between Base and Head is load-bearing: CommonMark merges
    # consecutive plain lines into one paragraph in every preview.
    packet = f'# Review packet: {design_path.parent.name} — {label}\n\nBase: {base}\n\nHead: {head}\n\n'
    for title, content in sections:
        packet += f'## {title}\n\n{content}\n'
    # All parsing and Git reads finish before a temporary file exists. A failure in
    # assembly leaves an earlier complete packet intact. Replacement is same-directory.
    temporary = None
    try:
        validate_destination(destination)
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='', dir=destination.parent,
                                         prefix=f'.{destination.name}.', delete=False) as output:
            temporary = Path(output.name)
            output.write(packet)
            output.flush()
            os.fsync(output.fileno())
        validate_destination(destination)
        os.replace(temporary, destination)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink()
    print(f'Wrote {destination}\nRange: {base}..{head}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog=(
        '--project resolves from the caller cwd and must be a Git worktree root. '
        '--design and --progress are absolute or relative to --project, not the skill or cwd. '
        'Output is <leaf>-review-packet[-rN].md beside the matched docs in docs/plans/<topic>/. '
        'Commit cells contain ordered whitespace-separated hexadecimal commit IDs, not revision expressions.'
    ))
    parser.add_argument('--project', required=True)
    parser.add_argument('--design', required=True)
    parser.add_argument('--progress', required=True)
    parser.add_argument('--scope', choices=['feature', 'requirement'], required=True)
    parser.add_argument('--requirement', type=int)
    args = parser.parse_args()
    if (args.scope == 'requirement') != (args.requirement is not None):
        parser.error('--requirement N is required only for --scope requirement')
    try:
        if sys.version_info < (3, 9):
            raise PacketError('Python 3.9 or newer is required; install it explicitly before retrying')
        build(args)
    except (PacketError, OSError, ValueError) as error:
        print(f'error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
