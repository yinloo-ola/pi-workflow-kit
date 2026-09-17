#!/usr/bin/env python3
"""Read-only validation of the workflow's Markdown design structure (Python 3.9+)."""

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
import sys
from typing import List, Optional, Tuple


TAG_VALUES = {
    "Checkpoints": ("none", "full"),
    "Review": ("skip", "parallel", "inline"),
    "Feature review": ("auto", "parallel", "inline"),
}
HEADING = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$")
REQUIREMENT = re.compile(r"^R([1-9][0-9]*):\s*(.*)$")
REQUIREMENT_LIKE = re.compile(r"^R(?:[0-9]|\s*:)")
CRITERIA = re.compile(r"^\*\*Acceptance criteria\*\*(?:\s*(?:—|–|-|:).*)?$")


@dataclass
class Heading:
    level: int
    title: str
    index: int


def visible_lines(text: str) -> Tuple[List[str], List[str]]:
    """Blank fenced examples, retaining indexes for diagnostics. Not a Markdown renderer."""
    lines = []
    errors = []
    fence = ""
    fence_line = 0
    for number, line in enumerate(text.splitlines(), 1):
        if fence:
            if re.fullmatch(r" {0,3}" + re.escape(fence[0]) + "{" + str(len(fence)) + r",}[ \t]*", line):
                fence = ""
            lines.append("")
            continue
        opening = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if opening and not (opening[1][0] == "`" and "`" in opening[2]):
            fence = opening[1]
            fence_line = number
            lines.append("")
        else:
            lines.append(line)
    if fence:
        errors.append(f"line {fence_line}: unclosed code fence; close it before validating")
    return lines, errors


def has_content(lines: List[str]) -> bool:
    # Check presence, not whether the assertion is true, testable, or sufficiently specific.
    for line in lines:
        text = re.sub(r"^\s*(?:[-+*]|[0-9]+[.)])\s*", "", line).strip()
        if text and re.search(r"\w", text):
            return True
    return False


def criteria_body(lines: List[str], start: int, end: int) -> List[str]:
    """A heading or another bold section label terminates criteria, not just the next R ID."""
    result = []
    for line in lines[start:end]:
        if HEADING.match(line) or re.match(r"^\s*\*\*[^*]+\*\*", line):
            break
        result.append(line)
    return result


def validate(text: str) -> Tuple[List[str], List[str]]:
    lines, errors = visible_lines(text)
    headings = []
    for index, line in enumerate(lines):
        match = HEADING.match(line)
        if match:
            headings.append(Heading(len(match[1]), match[2], index))
    for heading in headings:
        if REQUIREMENT_LIKE.match(heading.title) and heading.level != 3:
            errors.append(f"line {heading.index + 1}: {heading.title} must use a ### requirement heading")
    requirements = [h for h in headings if h.level == 3 and REQUIREMENT_LIKE.match(h.title)]
    features = [h for h in headings if h.level == 2 and h.title == "Feature acceptance"]
    summaries = []

    if not requirements:
        errors.append("required requirement block missing; add ### R1: <name> with Acceptance criteria")
    seen = set()
    for expected, heading in enumerate(requirements, 1):
        match = REQUIREMENT.fullmatch(heading.title)
        if not match:
            errors.append(f"line {heading.index + 1}: malformed requirement '{heading.title}'; use ### R{expected}: <name>")
            continue
        number = int(match[1])
        if number in seen:
            errors.append(f"line {heading.index + 1}: duplicate requirement R{number}")
        elif number != expected:
            errors.append(f"line {heading.index + 1}: expected R{expected}, found R{number}; IDs must be sequential in document order")
        seen.add(number)
        if not match[2].strip():
            errors.append(f"line {heading.index + 1}: R{number} requires a nonempty name")

    intro_end = requirements[0].index if requirements else len(lines)
    short = any(re.match(r"^In short:\s*\S.*$", line) for line in lines[:intro_end])
    full_format = any(h.level == 2 and h.title in ("At a glance", "Requirements") for h in headings)
    trivial = short and not full_format and len(requirements) == 1 and requirements[0].title.startswith("R1:") and not features
    if not trivial and not features:
        errors.append("## Feature acceptance is required for non-trivial designs; the trivial exception needs an In short: one-liner and a single R1 block without full-format sections")
    if len(features) > 1:
        errors.append("duplicate ## Feature acceptance section; keep exactly one")

    # Record ownership so a valid-looking tag cannot silently land outside its section.
    owned_tags = set()

    def tags(start: int, end: int, names: Tuple[str, ...], owner: str) -> dict:
        values = {name: TAG_VALUES[name][0] for name in names}
        found = set()
        for heading in headings:
            if not start <= heading.index < end:
                continue
            for name in names:
                if heading.level != 3 or not re.match(re.escape(name) + r"\b", heading.title):
                    continue
                owned_tags.add(heading.index)
                if name in found:
                    errors.append(f"line {heading.index + 1}: duplicate {name} tag in {owner}")
                found.add(name)
                value = heading.title[len(name):].strip()
                value = value[1:].strip() if value.startswith(":") else ""
                if value not in TAG_VALUES[name]:
                    allowed = " | ".join(TAG_VALUES[name])
                    errors.append(f"line {heading.index + 1}: invalid {name} tag in {owner}; expected {allowed}")
                else:
                    values[name] = value
        return values

    for heading in requirements:
        end = next((h.index for h in headings if h.index > heading.index and (h.level <= 2 or h in requirements)), len(lines))
        criteria_end = next((h.index for h in headings if heading.index < h.index < end), end)
        labels = [i for i in range(heading.index + 1, criteria_end) if CRITERIA.fullmatch(lines[i].strip())]
        owner = heading.title.split(":", 1)[0]
        if not labels:
            errors.append(f"line {heading.index + 1}: {owner} needs a standalone **Acceptance criteria** section")
        elif len(labels) > 1:
            errors.append(f"line {labels[1] + 1}: {owner} has duplicate Acceptance criteria sections")
        elif not has_content(criteria_body(lines, labels[0] + 1, end)):
            errors.append(f"line {labels[0] + 1}: {owner} Acceptance criteria is empty; add a criterion before the next section")
        values = tags(heading.index + 1, end, ("Checkpoints", "Review"), owner)
        summaries.append(f"{owner}: Checkpoints={values['Checkpoints']}, Review={values['Review']}")

    for heading in features:
        end = next((h.index for h in headings if h.index > heading.index and h.level <= 2), len(lines))
        if not has_content(criteria_body(lines, heading.index + 1, end)):
            errors.append(f"line {heading.index + 1}: Feature acceptance is empty; add an end-to-end criterion before its review tag")
        values = tags(heading.index + 1, end, ("Feature review",), "Feature acceptance")
        summaries.append(f"Feature review={values['Feature review']}")

    for heading in headings:
        for name in TAG_VALUES:
            if re.match(re.escape(name) + r"\b", heading.title) and heading.index not in owned_tags:
                owner = "## Feature acceptance" if name == "Feature review" else "a ### R<n>: requirement block"
                errors.append(f"line {heading.index + 1}: {name} must be a ### tag inside {owner}")
    return errors, summaries


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Read-only structural design validation. Requires Python 3.9+; standard library only. Semantic correctness is not verified.",
        epilog="Pass an explicit design path. Absolute paths are used directly; relative paths resolve from the caller's working directory (cwd), not the installed skill directory.",
    )
    parser.add_argument("design", type=Path, help="UTF-8 Markdown design file (quote paths containing spaces)")
    args = parser.parse_args(argv)
    if sys.version_info < (3, 9):
        print("Python 3.9+ is required; supply a compatible runtime before validation.", file=sys.stderr)
        return 2
    try:
        text = args.design.read_text(encoding="utf-8")
    except (OSError, UnicodeError, ValueError) as error:
        print(f"{args.design}: cannot read UTF-8 design: {error}", file=sys.stderr)
        return 2
    errors, summaries = validate(text)
    if errors:
        for error in errors:
            print(f"{args.design}: {error}", file=sys.stderr)
        return 1
    print(f"{args.design}: structural checks passed. Semantic correctness is not verified.")
    for summary in summaries:
        print(f"  {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
