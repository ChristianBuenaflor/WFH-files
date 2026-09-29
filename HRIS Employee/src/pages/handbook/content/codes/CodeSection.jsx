import React from "react";
import { Table } from "react-bootstrap";
import { SECTIONS } from "./handbookSections.js";


const renderBlock = (block, key) => {
  if (block.t === "p") return <p key={key}>{block.text}</p>;
  if (block.t === "sub") return <h3 key={key} className="privacy-subheading">{block.text}</h3>;
  if (block.t === "subsub") return <h4 key={key} className="privacy-subsubheading">{block.text}</h4>;
  if (block.t === "bullets")
    return (
      <ul key={key} className="privacy-section-list">
        {block.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    );
  if (block.t === "table")
    return (
      <div key={key} className="privacy-table-wrap">
        <Table bordered hover responsive size="sm" className="privacy-table">
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  return null;
};

const CodeSection = ({ sections = SECTIONS }) => {
  return (
    <>
      {sections.map((section) => (
        <section
          key={section.id}
          id={`privacy-${section.id}`}
          className="privacy-section"
        >
          <h2>{section.title}</h2>
          {section.blocks.map((b, i) => renderBlock(b, `${section.id}-${i}`))}
        </section>
      ))}
    </>
  );
};

export default CodeSection;

