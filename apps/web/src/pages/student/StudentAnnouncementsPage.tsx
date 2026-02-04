import { useState, useEffect } from 'react';
import { Bell, Calendar, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { studentPortalApi, type Announcement } from '@/lib/api/studentPortal';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'URGENT':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'ACADEMIC':
      return <Info className="h-5 w-5 text-blue-600" />;
    case 'FINANCE':
      return <Info className="h-5 w-5 text-amber-600" />;
    default:
      return <Megaphone className="h-5 w-5 text-muted-foreground" />;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'URGENT':
      return <Badge variant="destructive">Urgent</Badge>;
    case 'ACADEMIC':
      return <Badge className="bg-blue-100 text-blue-800">Academic</Badge>;
    case 'FINANCE':
      return <Badge className="bg-amber-100 text-amber-800">Finance</Badge>;
    case 'EVENT':
      return <Badge className="bg-purple-100 text-purple-800">Event</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'HIGH':
      return <Badge variant="destructive">High Priority</Badge>;
    case 'MEDIUM':
      return <Badge variant="outline">Medium</Badge>;
    default:
      return null;
  }
}

export function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getAnnouncements();
      if (response.success && response.data) {
        setAnnouncements(response.data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = filter === 'all'
    ? announcements
    : announcements.filter((a) => a.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-muted-foreground">Stay updated with university news</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="URGENT">Urgent</TabsTrigger>
          <TabsTrigger value="ACADEMIC">Academic</TabsTrigger>
          <TabsTrigger value="FINANCE">Finance</TabsTrigger>
          <TabsTrigger value="EVENT">Events</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No announcements found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={announcement.type === 'URGENT' ? 'border-destructive' : ''}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getTypeIcon(announcement.type)}
                        <div>
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(announcement.publishedAt)}
                            {announcement.author && (
                              <>
                                <span>•</span>
                                <span>By {announcement.author}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getPriorityBadge(announcement.priority)}
                        {getTypeBadge(announcement.type)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-sm text-muted-foreground ${
                        expandedId === announcement.id ? '' : 'line-clamp-3'
                      }`}
                    >
                      {announcement.content}
                    </div>
                    {announcement.content.length > 200 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 p-0 h-auto"
                        onClick={() =>
                          setExpandedId(expandedId === announcement.id ? null : announcement.id)
                        }
                      >
                        {expandedId === announcement.id ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                    {announcement.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expires: {formatDate(announcement.expiresAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
