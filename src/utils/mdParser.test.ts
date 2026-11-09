import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "./mdParser";


describe("parseMarkdown", () => {
  // 1. Тестирование заголовков
  describe("Headings", () => {
    it("should parse h1, h2, and h3 correctly", () => {
      expect(parseMarkdown("# Header 1\n## Header 2\n### Header 3"))
        .toBe("<h1>Header 1</h1><h2>Header 2</h2><h3>Header 3</h3>");
    });

    it("should parse heading at the very end of the text (no trailing newline)", () => {
      expect(parseMarkdown("# Last Line Heading"))
        .toBe("<h1>Last Line Heading</h1>");
    });

    it("should not insert <br /> after headings", () => {
      // Финальный тег должен быть чистым, без <br /> на стыке с другими элементами
      const input = "# Title\nSome text";
      const expected = "<h1>Title</h1>Some text";
      expect(parseMarkdown(input)).toBe(expected);
    });
  });

  // 2. Тестирование жирного текста
  describe("Bold text", () => {
    it("should wrap text in <strong> tags", () => {
      expect(parseMarkdown("This is **bold** text"))
        .toBe("This is <strong>bold</strong> text");
    });

    it("should handle multiple bold segments in one line (lazy matching)", () => {
      expect(parseMarkdown("First **bold** and second **bold**"))
        .toBe("First <strong>bold</strong> and second <strong>bold</strong>");
    });

    it("should work inside headings", () => {
      expect(parseMarkdown("# Heading with **bold** text"))
        .toBe("<h1>Heading with <strong>bold</strong> text</h1>");
    });
  });

  // 3. Тестирование переносов строк
  describe("Line breaks", () => {
    it("should convert plain newlines into <br />", () => {
      expect(parseMarkdown("Line 1\nLine 2\nLine 3"))
        .toBe("Line 1<br />Line 2<br />Line 3");
    });

    it("should preserve multiple sequential line breaks", () => {
      expect(parseMarkdown("Paragraph 1\n\nParagraph 2"))
        .toBe("Paragraph 1<br /><br />Paragraph 2");
    });
  });

  // 4. Тестирование безопасности (XSS)
  describe("Security / HTML Escaping", () => {
    it("should escape script tags and dangerous HTML characters", () => {
      const input = "<script>alert('xss')</script>\n<div>Safe</div>";
      const expected = "&lt;script&gt;alert('xss')&lt;/script&gt;<br />&lt;div&gt;Safe&lt;/div&gt;";
      expect(parseMarkdown(input)).toBe(expected);
    });

    it("should parse markdown even if it contains escaped characters", () => {
      expect(parseMarkdown("# Heading <with> brackets"))
        .toBe("<h1>Heading &lt;with&gt; brackets</h1>");
    });
  });
});
