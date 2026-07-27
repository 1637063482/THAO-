import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    buildContextBundle,
    extractStatus,
    extractTaskSection,
    resolveRepoPath,
    runCli,
} from "../../scripts/task-context.mjs";

const temporaryRoots = [];

afterEach(() => {
    temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

const context = "# Compact Context\n\nNever deploy production resources.";
const taskPlan = `# Plan

## UXS-005：Previous task

previous details

## UXS-006：Current task

- Task ID: UXS-006
- 目标: render a daily ledger

## UXS-007：Future task

future details
`;
const reviewPlan = `| Task | Check |
|---|---|
| UXS-005 | previous review |
| UXS-006 | current review |
| UXS-007 | future review |
`;

function statusMarkdown({ state = "PLANNED", task = "UXS-006", next = "UXS-007", latestReview = "pending" } = {}) {
    return `# Task Workflow Status

| Field | Value |
|---|---|
| Task ID | ${task} |
| State | ${state} |
| Evidence | \`docs/review-evidence/${task}.md\` |
| Latest Review | ${latestReview} |
| Next Task | ${next} |
`;
}

describe("task context extraction", () => {
    it("extracts structured fields from TASK_STATUS", () => {
        expect(extractStatus(statusMarkdown())).toMatchObject({
            taskId: "UXS-006",
            state: "PLANNED",
            nextTask: "UXS-007",
        });
    });

    it("extracts only the requested Task section", () => {
        const section = extractTaskSection(taskPlan, "UXS-006");

        expect(section).toContain("render a daily ledger");
        expect(section).not.toContain("Previous task");
        expect(section).not.toContain("Future task");
    });

    it("gives a planned Coder only compact rules and the current Task", () => {
        const output = buildContextBundle({
            role: "coder",
            compactContext: context,
            statusMarkdown: statusMarkdown(),
            taskPlan,
            reviewPlan,
        });

        expect(output).toContain("Compact Context");
        expect(output).toContain("UXS-006：Current task");
        expect(output).not.toContain("UXS-005：Previous task");
        expect(output).not.toContain("UXS-007：Future task");
        expect(output).not.toContain("current review");
    });

    it("selects the next Task for a Coder after approval", () => {
        const output = buildContextBundle({
            role: "coder",
            compactContext: context,
            statusMarkdown: statusMarkdown({ state: "APPROVED", task: "UXS-005", next: "UXS-006" }),
            taskPlan,
            reviewPlan,
        });

        expect(output).toContain("UXS-006：Current task");
        expect(output).not.toContain("UXS-005：Previous task");
    });

    it("includes the latest review only for Coder rework", () => {
        const output = buildContextBundle({
            role: "coder",
            compactContext: context,
            statusMarkdown: statusMarkdown({
                state: "CHANGES_REQUESTED",
                latestReview: "`docs/task-reviews/UXS-006-R1.md` - CHANGES_REQUESTED",
            }),
            taskPlan,
            reviewPlan,
            latestReview: "# Review\n\nMinimum correction: restore focus.",
        });

        expect(output).toContain("Minimum correction: restore focus.");
    });

    it("gives a ready Reviewer the current Task, review row and evidence", () => {
        const output = buildContextBundle({
            role: "reviewer",
            compactContext: context,
            statusMarkdown: statusMarkdown({ state: "READY_FOR_REVIEW" }),
            taskPlan,
            reviewPlan,
            evidence: "# Evidence\n\nAll synthetic fixtures.",
        });

        expect(output).toContain("UXS-006：Current task");
        expect(output).toContain("| UXS-006 | current review |");
        expect(output).toContain("All synthetic fixtures.");
        expect(output).not.toContain("previous review");
        expect(output).not.toContain("future review");
    });

    it("uses the current task as review criteria when no separate review row exists", () => {
        const output = buildContextBundle({
            role: "reviewer",
            compactContext: context,
            statusMarkdown: statusMarkdown({ state: "READY_FOR_REVIEW" }),
            taskPlan,
            reviewPlan: "# No separate review plan",
            evidence: "# Evidence\n\nAll gates passed.",
        });

        expect(output).toContain("--- REVIEW CRITERIA ---");
        expect(output).toContain("render a daily ledger");
    });

    it("stops a Reviewer when the state is not ready", () => {
        const output = buildContextBundle({
            role: "reviewer",
            compactContext: context,
            statusMarkdown: statusMarkdown({ state: "IMPLEMENTING" }),
            taskPlan,
            reviewPlan,
        });

        expect(output).toContain("STOP");
        expect(output).not.toContain("UXS-006：Current task");
    });

    it("rejects unsupported roles, states and missing Task sections", () => {
        const base = {
            compactContext: context,
            statusMarkdown: statusMarkdown(),
            taskPlan,
            reviewPlan,
        };

        expect(() => buildContextBundle({ ...base, role: "architect" })).toThrow("Unsupported role");
        expect(() => buildContextBundle({
            ...base,
            role: "coder",
            statusMarkdown: statusMarkdown({ state: "UNKNOWN" }),
        })).toThrow("Unsupported workflow state");
        expect(() => extractTaskSection(taskPlan, "UXS-999")).toThrow("Task UXS-999 not found");
    });

    it("refuses evidence or review paths outside the repository", () => {
        expect(resolveRepoPath("C:/repo", "docs/review.md")).toMatch(/repo[\\/]docs[\\/]review\.md$/);
        expect(() => resolveRepoPath("C:/repo", "../secret.txt")).toThrow("outside repository");
    });

    it("loads the task plan named by TASK_STATUS", () => {
        const root = mkdtempSync(join(tmpdir(), "my-expense-context-"));
        temporaryRoots.push(root);
        mkdirSync(join(root, "docs"));
        writeFileSync(join(root, "docs", "CODEX_CONTEXT.md"), context);
        writeFileSync(join(root, "docs", "maintenance.md"), taskPlan.replaceAll("UXS-006", "REM-016"));
        writeFileSync(join(root, "REVIEW_PLAN.md"), reviewPlan.replaceAll("UXS-006", "REM-016"));
        writeFileSync(join(root, "TASK_STATUS.md"), `${statusMarkdown({ task: "REM-016" })}| Plan | \`docs/maintenance.md\` |\n`);

        expect(runCli("coder", root)).toContain("REM-016");
    });
});
