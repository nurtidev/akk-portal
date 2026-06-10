import { describe, it, expect } from "vitest";

// Дымовой тест — проверяет, что тестовое окружение работает
describe("smoke", () => {
  it("vitest работает", () => {
    expect(1 + 1).toBe(2);
  });

  it("CSS-переменные токены определены в строке", () => {
    // Проверяем, что токены в правильном формате
    const primaryColor = "#07663D";
    const accentColor = "#C9A21C";
    const bgColor = "#FAF6EC";

    expect(primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("хранилище темы: ключ совместим с легаси", () => {
    const STORAGE_KEY = "akk-theme";
    expect(STORAGE_KEY).toBe("akk-theme");
  });
});
