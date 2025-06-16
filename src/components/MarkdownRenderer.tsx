import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  let title = '';
  let abstract = '';

  const parts = content.split('# Abstract:');
  const titlePart = parts[0];
  const abstractPart = parts.length > 1 ? parts[1] : '';

  if (titlePart.startsWith('# Title:')) {
    title = titlePart.replace('# Title:', 'Paper Title:').trim();
    abstract = abstractPart.trim();
  } else {
    abstract = content;
    if (abstract.startsWith('# Abstract:')) {
      abstract = abstract.trim();
    }
  }

  return (
    <div>
      {title && <p className="font-bold mb-2">{title}</p>}
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-0" {...props} />,
        }}
      >
        {abstract}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 