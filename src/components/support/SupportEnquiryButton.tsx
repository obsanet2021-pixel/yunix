import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupportEnquiryModal from './SupportEnquiryModal';

export default function SupportEnquiryButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-green-500/30 text-green-500 hover:bg-green-500/10"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Enquiry / Support</span>
      </Button>
      
      <SupportEnquiryModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}