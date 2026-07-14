'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/spinner';
import { API_URL } from '@/lib/api/client';
import { listMyCertificates } from '@/lib/api/learning';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

function resolveUrl(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useQuery({
    queryKey: queryKeys.certificates,
    queryFn: listMyCertificates,
  });

  if (isLoading || !certificates) return <PageSpinner />;

  return (
    <div className="max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-1.5">
        Certificates
      </h1>
      <p className="text-ink-500 text-[15px] mb-6">Awarded automatically when you complete a course.</p>

      {certificates.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No certificates yet"
          description="Finish every lecture in a course to earn your first certificate."
          action={
            <Link href="/my-learning">
              <Button>Go to My Learning</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white border border-ink-200 rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3.5">
                <Award size={20} className="text-amber-700" />
              </div>
              <div className="font-display font-bold text-[15.5px] text-ink-800 mb-1 line-clamp-2">
                {cert.course?.title ?? 'Course'}
              </div>
              <div className="text-xs text-ink-400 mb-1">Issued {formatDate(cert.issuedAt)}</div>
              <div className="text-xs text-ink-400 mb-4">Certificate No. {cert.certificateNumber}</div>
              <a href={resolveUrl(cert.pdfUrl)} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <Download size={14} /> Download PDF
                </Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
