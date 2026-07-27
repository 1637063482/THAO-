import { describe, expect, it } from "vitest";
import { depositErrorMessage } from "../../src/js/deposit-errors.js";

describe("depositErrorMessage", () => {
  it.each([
    [{ code: "permission-denied" }, "vi", "Bạn không có quyền thực hiện thao tác này."],
    [{ code: "DEPOSIT_VERSION_CONFLICT" }, "zh-CN", "存款已被其他更改更新，请刷新后重试。"],
    [{ code: "INVALID_DEPOSIT_AMOUNT" }, "vi", "Vui lòng kiểm tra thông tin tiền gửi rồi thử lại."],
    [{ code: "unavailable" }, "zh-CN", "当前离线，请恢复网络后重试。"],
  ])("maps known errors to a safe localized message", (error, locale, expected) => {
    expect(depositErrorMessage(error, locale)).toBe(expected);
  });

  it("does not expose unknown error details", () => {
    expect(depositErrorMessage(new Error("artifacts/private/user@example.test/secret"), "vi"))
      .toBe("Không thể hoàn tất thao tác. Vui lòng thử lại.");
  });
});
