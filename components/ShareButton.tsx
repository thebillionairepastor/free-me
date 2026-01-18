
import React, { useState, useRef, useEffect } from 'react';
import { Share2, Copy, Mail, MessageCircle, Check, Link, Printer } from 'lucide-react';
import { View } from '../types';

interface ShareButtonProps {
  content: string;
  title: string;
  view?: View;
  id?: string;
  topic?: string;
  onPrint?: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({ content, title, view, id, topic, onPrint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = new URL(baseUrl);
    
    if (view) url.searchParams.set('view', view);
    if (id) url.searchParams.set('id', id);
    if (topic) url.searchParams.set('topic', topic);
      
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`*${title}*\n\n${content}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`AntiRisk Security: ${title}`);
    const body = encodeURIComponent(content);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-[#2563eb] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 z-10"
      >
        <Share2 size={18} strokeWidth={2.5} />
        Broadcast
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-[#0a1222] border border-slate-800/60 rounded-[1.25rem] shadow-[0_10px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right ring-1 ring-white/5">
          <div className="p-1.5 space-y-0.5">
            <button 
              onClick={() => { handleWhatsApp(); setIsOpen(false); }}
              className="flex items-center w-full gap-4 px-4 py-3 text-left text-[14px] font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors rounded-xl"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <MessageCircle size={18} className="text-[#25D366]" strokeWidth={2} />
              </div>
              WhatsApp
            </button>
            
            <button 
              onClick={() => { handleEmail(); setIsOpen(false); }}
              className="flex items-center w-full gap-4 px-4 py-3 text-left text-[14px] font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors rounded-xl"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Mail size={18} className="text-blue-500" strokeWidth={2} />
              </div>
              Email Team
            </button>

            <div className="h-px bg-slate-800/40 mx-2 my-1.5" />

            <button 
              onClick={handleCopyLink}
              className="flex items-center w-full justify-between px-4 py-3 text-left text-[14px] font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Link size={18} className="text-slate-500" strokeWidth={2} />
                </div>
                Copy Share Link
              </div>
              {copiedLink && <Check size={14} className="text-emerald-500" />}
            </button>

            <button 
              onClick={() => { handlePrint(); setIsOpen(false); }}
              className="flex items-center w-full gap-4 px-4 py-3 text-left text-[14px] font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors rounded-xl"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Printer size={18} className="text-slate-500" strokeWidth={2} />
              </div>
              Print Document
            </button>

            <button 
              onClick={handleCopyText}
              className="flex items-center w-full justify-between px-4 py-3 text-left text-[14px] font-semibold text-slate-200 hover:bg-slate-800/60 hover:text-white transition-colors rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Copy size={18} className="text-slate-500" strokeWidth={2} />
                </div>
                Copy Plain Text
              </div>
              {copiedText && <Check size={14} className="text-emerald-500" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
