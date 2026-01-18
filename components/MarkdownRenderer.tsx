
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-black text-white border-b border-slate-800 pb-4 mb-6" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-bold text-blue-400 my-4 uppercase tracking-widest" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-md font-black text-emerald-400 mt-8 mb-4 flex items-center gap-2 border-l-4 border-emerald-500 pl-4 bg-emerald-500/5 py-2 rounded-r-xl" {...props} />,
          h4: ({node, ...props}) => <h4 className="text-sm font-black text-slate-100 mt-6 mb-2 flex items-center gap-2" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside my-4 space-y-2 text-slate-300" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside my-4 space-y-3 text-slate-300 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-300 leading-relaxed font-medium" {...props} />,
          strong: ({node, ...props}) => <strong className="text-blue-300 font-black" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 text-slate-300 leading-relaxed text-base" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 my-6 italic text-slate-400 bg-slate-800/30 py-4 pr-4 rounded-r-2xl" {...props} />,
          a: ({node, ...props}) => <a className="text-blue-400 hover:underline font-bold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
