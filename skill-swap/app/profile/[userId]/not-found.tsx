import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserX, ArrowLeft, Search } from 'lucide-react';

export default function UserNotFound() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <UserX className="h-10 w-10 text-muted-foreground" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              User Not Found
            </h1>

            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The profile you&apos;re looking for doesn&apos;t exist or may have
              been removed.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/search">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Button>
              </Link>
              <Link href="/search">
                <Button>
                  <Search className="h-4 w-4 mr-2" />
                  Find Skills
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </>
  );
}
