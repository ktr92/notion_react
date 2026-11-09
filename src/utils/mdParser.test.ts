import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "./mdParser";

describe("TS Helpers Utility Functions", () => {
  describe("formatPrice", () => {
    it("h3 h2 h1", () => {
      const result: string = parseMarkdown("# text");
      expect(result).toBe("<h1>text</h1>");
    });
    it("h2", () => {
      const result: string = parseMarkdown("## text");
      expect(result).toBe("<h2>text</h2>");
    });
    it("h3", () => {
      const result: string = parseMarkdown("### text");
      expect(result).toBe("<h3>text</h3>");
    });
    it("strong", () => {
      const result: string = parseMarkdown("**text**");
      expect(result).toBe("<strong>text</strong>");
    });
    it("br", () => {
      const result: string = parseMarkdown("text\ntext");
      expect(result).toBe("text<br />text");
    });
  });
});
