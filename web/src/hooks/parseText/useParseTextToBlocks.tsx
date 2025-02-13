import { JSX } from "react";
import styles from "./ParseText.module.scss";

export const useParseTextToBlocks = (text: string) => {
  const lines = text.split("\n");
  const result: JSX.Element[] = [];
  let codeBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        result.push(
          <div key={index} className={styles.codeBlock}>
            <div className={styles.codeHeader}>{codeLanguage}</div>
            <pre className={styles.code}>
              <code className={styles.inlineCode}>{codeBlock.join("\n")}</code>
            </pre>
          </div>
        );
        codeBlock = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.replace("```", "").trim() || "plaintext";
      }
    } else if (inCodeBlock) {
      codeBlock.push(line);
    } else if (/^\*\*(.+)\*\*$/.test(line)) {
      // Обработка **Text** как заголовок второго уровня
      const parsedLine = line.replace(/\*\*(.+)\*\*/, (match, p1) => {
        return p1.replace(
          /`([^`]+)`/g,
          (match: any, code: any) => `<code>${code}</code>`
        );
      });
      result.push(
        <h4
          key={index}
          className={styles.heading}
          dangerouslySetInnerHTML={{ __html: parsedLine }}
        />
      );
    } else if (/^\*([^*]+)\*$/.test(line)) {
      // Обработка *Text* как заголовок первого уровня
      const parsedLine = line.replace(/\*([^*]+)\*/, "<code>$1</code>");
      result.push(
        <h3
          key={index}
          className={styles.heading}
          dangerouslySetInnerHTML={{ __html: parsedLine }}
        />
      );
    } else if (/^\d+\./.test(line)) {
      // Обработка нумерованных списков
      const parsedLine = line
        .replace(/\d+\.\s*/, "")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      result.push(
        <ol key={index} className={styles.orderedList}>
          <li dangerouslySetInnerHTML={{ __html: parsedLine }} />
        </ol>
      );
    } else if (/^\* /.test(line)) {
      // Обработка маркеров списка
      let parsedLine = line
        .replace(/^\* /, "") // Убираем звездочку для маркера списка
        .replace(/`([^`]+)`/g, "<code>$1</code>"); // Заменяем инлайн-код

      // Если строка содержит **Text** (заголовок второго порядка)
      if (/\*\*(.+)\*\*/.test(parsedLine)) {
        parsedLine = parsedLine.replace(/\*\*(.+)\*\*/, (match, p1) => {
          const parsedHeader = p1.replace(
            /`([^`]+)`/g,
            (match: any, code: any) => `<code>${code}</code>` // Заменяем инлайн-код в заголовке
          );
          // Преобразуем в заголовок второго порядка
          return `<h4>${parsedHeader}</h4>`;
        });
      }

      result.push(
        <ul key={index} className={styles.unorderedList}>
          <li dangerouslySetInnerHTML={{ __html: parsedLine }} />
        </ul>
      );
    } else if (/\*\*(.+)\*\*/.test(line)) {
      // Обработка **Text** в обычном тексте
      const parsedLine = line.replace(/\*\*(.+)\*\*/, (match, p1) => {
        return p1.replace(/`([^`]+)`/g, "<code>$1</code>");
      });
      result.push(
        <p
          key={index}
          className={styles.text}
          dangerouslySetInnerHTML={{ __html: parsedLine }}
        />
      );
    } else {
      // Обычный текст
      const parsedLine = line.replace(/`([^`]+)`/g, `<code>$1</code>`);
      result.push(
        <p
          key={index}
          className={styles.text}
          dangerouslySetInnerHTML={{ __html: parsedLine }}
        />
      );
    }
  });

  return result;
};
