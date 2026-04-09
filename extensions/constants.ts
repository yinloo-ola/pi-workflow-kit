/**
 * Shared constants for pi-superpowers-plus extensions.
 *
 * PLAN_TRACKER_TOOL_NAME is the integration contract between plan-tracker and
 * workflow-monitor: when plan-tracker receives an "init" action, workflow-monitor
 * observes it to advance the workflow phase to "execute". This coupling is
 * intentional and documented here.
 */
export const PLAN_TRACKER_TOOL_NAME = "plan_tracker";
