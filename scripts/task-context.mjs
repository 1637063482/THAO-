import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_STATES = new Set([
    "PLANNED",
    "IMPLEMENTING",
    "READY_FOR_REVIEW",
    "CHANGES_REQUESTED",
    "APPROVED",
    "BLOCKED",
]);

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractStatus(markdown) {
    const fields = new Map();
    for (const line of markdown.split(/\r?\n/)) {
        const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|$/);
        if (match && match[1] !== "Field" && !match[1].startsWith("---")) {
            fields.set(match[1], match[2]);
        }
    }

    const taskId = fields.get("Task ID");
    const state = fields.get("State");
    if (!taskId || !state) {
        throw new Error("TASK_STATUS.md is missing Task ID or State");
    }
    if (!ALLOWED_STATES.has(state)) {
        throw new Error(`Unsupported workflow state: ${state}`);
    }

    return {
        taskId,
        state,
        evidence: fields.get("Evidence") ?? "pending",
        latestReview: fields.get("Latest Review") ?? "pending",
        nextTask: fields.get("Next Task") ?? "none",
    };
}

export function extractTaskSection(markdown, taskId) {
    const heading = new RegExp(`^##\\s+${escapeRegExp(taskId)}(?:：|:|\\s|$)`, "m");
    const match = heading.exec(markdown);
    if (!match) {
        throw new Error(`Task ${taskId} not found in TASK_PLAN.md`);
    }
    const remainder = markdown.slice(match.index + match[0].length);
    const nextHeading = /^##\s+/m.exec(remainder);
    const end = nextHeading ? match.index + match[0].length + nextHeading.index : markdown.length;
    return markdown.slice(match.index, end).trim();
}

export function extractReviewRow(markdown, taskId) {
    const row = markdown.split(/\r?\n/).find((line) =>
        new RegExp(`^\\|\\s*${escapeRegExp(taskId)}\\s*\\|`).test(line),
    );
    if (!row) {
        throw new Error(`Review criteria for ${taskId} not found in REVIEW_PLAN.md`);
    }
    return row;
}

function section(title, content) {
    return `\n\n--- ${title} ---\n${content.trim()}`;
}

export function buildContextBundle({
    role,
    compactContext,
    statusMarkdown,
    taskPlan,
    reviewPlan,
    evidence = "",
    latestReview = "",
}) {
    if (role !== "coder" && role !== "reviewer") {
        throw new Error(`Unsupported role: ${role}`);
    }

    const status = extractStatus(statusMarkdown);
    let output = compactContext.trim() + section("CURRENT STATUS", statusMarkdown);

    if (role === "reviewer" && status.state !== "READY_FOR_REVIEW") {
        return output + `\n\nSTOP: Reviewer cannot act while state is ${status.state}.`;
    }
    if (role === "coder" && ["READY_FOR_REVIEW", "BLOCKED"].includes(status.state)) {
        return output + `\n\nSTOP: Coder cannot act while state is ${status.state}.`;
    }

    const targetTask = role === "coder" && status.state === "APPROVED"
        ? status.nextTask
        : status.taskId;
    if (!targetTask || targetTask === "none") {
        throw new Error("No actionable Task is recorded in TASK_STATUS.md");
    }

    output += section("ACTIONABLE TASK", extractTaskSection(taskPlan, targetTask));

    if (role === "coder" && status.state === "CHANGES_REQUESTED") {
        if (!latestReview.trim()) {
            throw new Error("CHANGES_REQUESTED requires the latest review content");
        }
        output += section("LATEST REVIEW", latestReview);
    }

    if (role === "reviewer") {
        if (!evidence.trim()) {
            throw new Error("READY_FOR_REVIEW requires evidence content");
        }
        output += section("REVIEW CRITERIA", extractReviewRow(reviewPlan, targetTask));
        output += section("CODER EVIDENCE", evidence);
        if (latestReview.trim()) {
            output += section("PRIOR REVIEW", latestReview);
        }
    }

    return output;
}

function pathFromStatus(value) {
    const match = value.match(/`([^`]+)`/);
    return match?.[1] ?? null;
}

export function resolveRepoPath(repoRoot, requestedPath) {
    const root = resolve(repoRoot);
    const fullPath = resolve(root, requestedPath);
    const relativePath = relative(root, fullPath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error(`Context path is outside repository: ${requestedPath}`);
    }
    return fullPath;
}

function readOptional(repoRoot, requestedPath) {
    if (!requestedPath) return "";
    const fullPath = resolveRepoPath(repoRoot, requestedPath);
    return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function runCli(role, repoRoot = process.cwd()) {
    const statusMarkdown = readFileSync(resolve(repoRoot, "TASK_STATUS.md"), "utf8");
    const status = extractStatus(statusMarkdown);
    return buildContextBundle({
        role,
        compactContext: readFileSync(resolve(repoRoot, "docs/CODEX_CONTEXT.md"), "utf8"),
        statusMarkdown,
        taskPlan: readFileSync(resolve(repoRoot, "TASK_PLAN.md"), "utf8"),
        reviewPlan: readFileSync(resolve(repoRoot, "REVIEW_PLAN.md"), "utf8"),
        evidence: readOptional(repoRoot, pathFromStatus(status.evidence)),
        latestReview: readOptional(repoRoot, pathFromStatus(status.latestReview)),
    });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
    try {
        process.stdout.write(`${runCli(process.argv[2])}\n`);
    } catch (error) {
        process.stderr.write(`Context loader error: ${error.message}\n`);
        process.exitCode = 1;
    }
}
