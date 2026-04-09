/**
 * Shared constants for pi-workflow-kit extensions.
 *
 * PLAN_TRACKER_TOOL_NAME is the stable integration contract between plan-tracker
 * and workflow-monitor: when plan-tracker receives an "init" action,
 * workflow-monitor observes it to advance the workflow phase to "execute".
 * This tool id intentionally remains unchanged across the rebrand.
 */
export const PLAN_TRACKER_TOOL_NAME = "plan_tracker";
