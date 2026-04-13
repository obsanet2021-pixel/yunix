import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Building2, FileText, Award, Info, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CertificateSize {
  id: string;
  prop_firm_name: string;
  certificate_type: string;
  size: string;
}

interface GroupedFirm {
  name: string;
  certificates: CertificateSize[];
}

export function PropFirmCertificateSizesGuide() {
  const [sizes, setSizes] = useState<CertificateSize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("prop_firm_certificate_sizes")
        .select("id, prop_firm_name, certificate_type, size")
        .order("prop_firm_name", { ascending: true });

      if (error) throw error;
      setSizes(data || []);
    } catch (error) {
      console.error("Error fetching certificate sizes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group sizes by prop firm
  const groupedFirms: GroupedFirm[] = sizes.reduce((acc, size) => {
    const existing = acc.find(f => f.name === size.prop_firm_name);
    if (existing) {
      existing.certificates.push(size);
    } else {
      acc.push({ name: size.prop_firm_name, certificates: [size] });
    }
    return acc;
  }, [] as GroupedFirm[]);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groupedFirms.length === 0) {
    return null; // Don't show if no data
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Prop Firm Certificate Sizes Guide
        </CardTitle>
        <CardDescription>
          Use this guide to identify the correct certificate size when ordering your plaque. Match your prop firm and certificate type to find the right size.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Click on any prop firm below to view its certificate types and sizes.
          </p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {groupedFirms.map((firm) => (
            <AccordionItem 
              key={firm.name} 
              value={firm.name}
              className="border border-border/50 rounded-lg bg-background/50 px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold text-left">{firm.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {firm.certificates.length} {firm.certificates.length === 1 ? 'type' : 'types'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-2 pt-2">
                  {firm.certificates.map((cert) => (
                    <div 
                      key={cert.id} 
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{cert.certificate_type}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono">{cert.size}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
