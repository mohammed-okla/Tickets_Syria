import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BusinessPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('business_management')}</h1>
        <p className="text-muted-foreground">{t('business_management_description')}</p>
      </div>

      <Card>
        <CardContent className="text-center py-12">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('business_page_coming_soon')}</h3>
          <p className="text-muted-foreground">{t('business_page_description')}</p>
        </CardContent>
      </Card>
    </div>
  );
}