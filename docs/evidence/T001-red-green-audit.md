# T001 RED→GREEN 审计证据

> 生成日期：2026-07-17  
> 测试文件：`tests/unit/smoke.test.js`（完全一致，无修改）

---

## RED 阶段

**基线提交：** `82f2dbe`（pre-T001，无 Vitest/jsdom/TypeScript）  
**工作树：** `.claude/worktrees/t001-red-evidence`  
**运行条件：** 只写入 `tests/unit/smoke.test.js`，未安装 Vitest 及任何测试依赖

### 测试脚本级失败

```text
$ npm test
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

- 退出码：**1**
- 原因：`package.json` 未包含 `"test"` 脚本

### 运行时环境级失败

```text
$ node tests/unit/smoke.test.js
file:///.../node_modules/@vitest/runner/dist/chunk-artifact.js:1848
        validateTags(runner.config, suiteTags);
                            ^

TypeError: Cannot read properties of undefined (reading 'config')
    at initSuite (file:///.../@vitest/runner/dist/chunk-artifact.js:1848:23)
    at createSuiteCollector (file:///.../@vitest/runner/dist/chunk-artifact.js:1709:2)
    at Object.suiteFn (file:///.../@vitest/runner/dist/chunk-artifact.js:1951:10)
    at chain (file:///.../@vitest/runner/dist/chunk-artifact.js:599:14)
    at file:///.../tests/unit/smoke.test.js:4:1
    at ModuleJob.run (node:internal/modules/esm/module_job:430:25)
    ...

Node.js v24.14.0
```

- 退出码：**1**
- 原因：`import { describe, it, expect } from "vitest"` 虽被 Node 解析到父目录 `node_modules`，但 Vitest runner 缺少 CLI 上下文（`runner.config` 未定义），测试无法执行

**结论：** 同一份 `smoke.test.js` 在未安装/配置测试基础设施时确信失败。

---

## GREEN 阶段

**当前 HEAD：** `aced182`（T001 完成后）  
**配置内容：** `vitest.config.js`（jsdom + setupFiles）、`tsconfig.json`（strict）、`package.json`（test/typecheck 脚本）

### npm test

```text
$ npm test -- --run

 RUN  v4.1.10

 ✓ Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  18:57:10
   Duration  1.34s

EXIT_CODE: 0
```

### npm run typecheck

```text
$ npm run typecheck

EXIT_CODE: 0
```

### npm run build

```text
$ npm run build
vite v6.4.3 building for production...
✓ 36 modules transformed.
✓ built in 2.48s

EXIT_CODE: 0
```

**结论：** 安装 Vitest/jsdom/TypeScript 并完成配置后，同一 `smoke.test.js` 通过，类型检查与构建均正常退出。

---

## 对比摘要

| 验证项 | RED（82f2dbe） | GREEN（aced182） |
|--------|---------------|-----------------|
| `npm test -- --run` | Missing script（exit 1） | 2/2 通过（exit 0） |
| `node tests/unit/smoke.test.js` | TypeError（exit 1） | 不适用（由 vitest 运行） |
| `npm run typecheck` | Missing script（exit 1） | exit 0 |
| `npm run build` | —（基线已存在） | exit 0（含 500kB 警告） |
