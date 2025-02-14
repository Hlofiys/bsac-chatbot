import { JSX } from "react";
import styles from "./ParseText.module.scss";
import CopyIcon from "@/components/icons/copy.icon/Copy.icon";
import { message } from "antd";

export const parseTextToBlocks = (text: string) => {
  const lines = text.split("\n");
  const result: JSX.Element[] = [];
  let codeBlock: string[] = [];
  let orderedList: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const codeContent = codeBlock.join("\n");
        result.push(
          <div key={index} className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              {codeLanguage}
              <CopyIcon
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(codeContent);
                    message.success("Код скопирован !");
                  } catch (err) {
                    console.log(err)
                    message.error("Произошла ошибка копирования !");
                  }
                }}
              />
            </div>
            <pre className={styles.code}>
              <code className={styles.inlineCode}>{codeContent}</code>
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
    } else if (/^\d+\./.test(line)) {
      let parsedLine = line
        .replace(/\d+\.\s*/, "") // Убираем номер
        .replace(/`([^`]+)`/g, "<code>$1</code>"); // Оборачиваем инлайн-код

      // Обработка **Text** как заголовок второго порядка
      if (/\*\*(.+)\*\*/.test(parsedLine)) {
        parsedLine = parsedLine.replace(/\*\*(.+)\*\*/, (_, p1) => {
          const parsedHeader = p1.replace(
            /`([^`]+)`/g,
            (_: string, code: string) => !!code && `<code>${code}</code>` // Инлайн-код в заголовке
          );
          return `<h4>${parsedHeader}</h4>`;
        });
      }

      orderedList.push(parsedLine);
    } else {
      if (orderedList.length) {
        result.push(
          <ol key={`ol-${index}`} className={styles.orderedList}>
            {orderedList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ol>
        );
        orderedList = [];
      }

      if (/^\*\*(.+)\*\*$/.test(line)) {
        const parsedLine = line.replace(/\*\*(.+)\*\*/, (_, p1) => {
          return p1.replace(/`([^`]+)`/g, "<code>$1</code>");
        });
        result.push(
          <h4
            key={index}
            className={styles.heading}
            dangerouslySetInnerHTML={{ __html: parsedLine }}
          />
        );
      } else if (/^\*([^*]+)\*$/.test(line)) {
        const parsedLine = line.replace(/\*([^*]+)\*/, "<code>$1</code>");
        result.push(
          <h3
            key={index}
            className={styles.heading}
            dangerouslySetInnerHTML={{ __html: parsedLine }}
          />
        );
      } else if (/^\* /.test(line)) {
        let parsedLine = line
          .replace(/^\* /, "")
          .replace(/`([^`]+)`/g, "<code>$1</code>");

        if (/\*\*(.+)\*\*/.test(parsedLine)) {
          parsedLine = parsedLine.replace(/\*\*(.+)\*\*/, (_, p1) => {
            const parsedHeader = p1.replace(
              /`([^`]+)`/g,
              (_: string, code: string) => !!code && `<code>${code}</code>`
            );
            return `<h4>${parsedHeader}</h4>`;
          });
        }

        result.push(
          <ul key={index} className={styles.unorderedList}>
            <li dangerouslySetInnerHTML={{ __html: parsedLine }} />
          </ul>
        );
      } else if (/\*\*(.+)\*\*/.test(line)) {
        const parsedLine = line.replace(/\*\*(.+)\*\*/, (_, p1) => {
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
        const parsedLine = line.replace(/`([^`]+)`/g, `<code>$1</code>`);
        result.push(
          <p
            key={index}
            className={styles.text}
            dangerouslySetInnerHTML={{ __html: parsedLine }}
          />
        );
      }
    }
  });

  if (orderedList.length) {
    result.push(
      <ol key="final-ol" className={styles.orderedList}>
        {orderedList.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ol>
    );
  }

  return result;
};
