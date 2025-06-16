import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parts = content.split('\\n');
  const title = parts[0];
  const restOfContent = parts.slice(1).join('\\n');

  return (
    <div>
      <p className="font-bold mb-2">{title}</p>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-0" {...props} />,
        }}
      >
        {restOfContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 