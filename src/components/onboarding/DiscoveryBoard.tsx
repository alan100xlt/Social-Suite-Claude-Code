import { useState } from 'react';
import { Globe, Rss, Building2, Users, ImageIcon, Mail, Phone, ExternalLink, ChevronRight, Sparkles, TrendingUp, Zap, MapPin } from 'lucide-react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube, FaTiktok, FaPinterestP, FaThreads } from 'react-icons/fa6';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CrawlData {
  businessName?: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  industry?: string;
  location?: string;
  screenshotUrl?: string;
  socialChannels?: { platform: string; url: string; username?: string }[];
  contact?: { email?: string; phone?: string };
  data?: {
    branding?: { colors?: string[]; fonts?: string[] };
    websiteImages?: string[];
    offerings?: string[];
    valuePropositions?: string[];
    competitiveDifferentiators?: string[];
    contentOpportunities?: string[];
  };
}

interface RssFeed {
  url: string;
  title: string;
  type: string;
  itemCount?: number;
  score: number;
}

interface DiscoveryBoardProps {
  crawlData: CrawlData | null;
  rssFeeds: RssFeed[];
  isLoading: boolean;
  phase: string;
}

const PLATFORM_CONFIG: Record<string, { icon: React.ComponentType<any>; gradient: string; label: string }> = {
  facebook: { icon: FaFacebookF, gradient: 'from-[#1877F2] to-[#0C63D4]', label: 'Facebook' },
  twitter: { icon: FaTwitter, gradient: 'from-[#1DA1F2] to-[#0C85D0]', label: 'Twitter / X' },
  instagram: { icon: FaInstagram, gradient: 'from-[#E4405F] via-[#C13584] to-[#833AB4]', label: 'Instagram' },
  linkedin: { icon: FaLinkedinIn, gradient: 'from-[#0A66C2] to-[#004182]', label: 'LinkedIn' },
  youtube: { icon: FaYoutube, gradient: 'from-[#FF0000] to-[#CC0000]', label: 'YouTube' },
  tiktok: { icon: FaTiktok, gradient: 'from-[#25F4EE] via-[#FE2C55] to-[#000000]', label: 'TikTok' },
  pinterest: { icon: FaPinterestP, gradient: 'from-[#E60023] to-[#AD081B]', label: 'Pinterest' },
  threads: { icon: FaThreads, gradient: 'from-[#000000] to-[#333333]', label: 'Threads' },
};

function AnimatedCounter({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-foreground font-['Space_Grotesk']">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ComponentType<any>; title: string; badge?: string | number }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
      {badge !== undefined && (
        <Badge className="ml-auto bg-primary/10 text-primary border-0 text-xs font-semibold">{badge}</Badge>
      )}
    </div>
  );
}

export function DiscoveryBoard({ crawlData, rssFeeds, isLoading, phase }: DiscoveryBoardProps) {
  const socialChannels = crawlData?.socialChannels || [];
  const images = crawlData?.data?.websiteImages || [];
  const contact = crawlData?.contact;
  const offerings = crawlData?.data?.offerings || [];
  const valueProps = crawlData?.data?.valuePropositions || [];
  const differentiators = crawlData?.data?.competitiveDifferentiators || [];
  const contentOpps = crawlData?.data?.contentOpportunities || [];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const screenshotSrc = crawlData?.screenshotUrl
    ? crawlData.screenshotUrl.startsWith('http')
      ? crawlData.screenshotUrl
      : `data:image/png;base64,${crawlData.screenshotUrl}`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ═══════════════════════════════════════════════
          HERO: Brand Identity Card — Full Width
         ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card">
        {/* Accent bar using publisher's primary color */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
          style={{ background: crawlData?.primaryColor ? `linear-gradient(90deg, ${crawlData.primaryColor}, ${crawlData.secondaryColor || crawlData.primaryColor}80)` : 'var(--gradient-primary)' }}
        />
        <div className="p-8 pt-10">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo — large and prominent */}
            {crawlData?.logoUrl ? (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-background border border-border/30 shadow-lg flex items-center justify-center p-3 flex-shrink-0">
                <img
                  src={crawlData.logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : isLoading ? (
              <Skeleton className="w-28 h-28 md:w-36 md:h-36 rounded-2xl flex-shrink-0" />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="w-14 h-14 text-muted-foreground/40" />
              </div>
            )}

            {/* Identity text */}
            <div className="min-w-0 flex-1 space-y-3">
              {crawlData?.businessName ? (
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight font-['Space_Grotesk'] leading-tight">
                  {crawlData.businessName}
                </h1>
              ) : (
                <Skeleton className="h-10 w-72" />
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {crawlData?.industry && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium px-3 py-1">
                    {crawlData.industry}
                  </Badge>
                )}
                {crawlData?.location && (
                  <Badge variant="outline" className="border-border/50 text-muted-foreground text-xs gap-1.5 px-3 py-1">
                    <MapPin className="w-3 h-3" />
                    {crawlData.location}
                  </Badge>
                )}
              </div>

              {crawlData?.description ? (
                <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                  {crawlData.description}
                </p>
              ) : isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full max-w-xl" />
                  <Skeleton className="h-4 w-3/4 max-w-lg" />
                </div>
              ) : null}

              {/* Contact chips */}
              {(contact?.email || contact?.phone) && (
                <div className="flex items-center gap-3 pt-1">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-full px-3 py-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-full px-3 py-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex md:flex-col gap-6 md:gap-4 flex-shrink-0 md:border-l md:border-border/30 md:pl-6">
              <AnimatedCounter value={socialChannels.length} label="Channels" />
              <AnimatedCounter value={rssFeeds.length} label="Feeds" />
              <AnimatedCounter value={images.length} label="Images" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 2: Website Preview + Social Presence
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Website Preview — large, 3 cols */}
        <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="p-6 pb-4">
            <SectionHeader icon={Globe} title="Website Preview" />
          </div>
          {screenshotSrc ? (
            <div className="relative group px-6 pb-6">
              {/* Browser chrome mockup */}
              <div className="rounded-xl border border-border/60 overflow-hidden shadow-lg">
                <div className="h-8 bg-muted/80 flex items-center gap-2 px-4 border-b border-border/40">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-background/80 rounded-md px-3 py-0.5 text-[10px] text-muted-foreground truncate max-w-xs">
                      {crawlData?.data ? new URL(crawlData?.logoUrl || 'https://example.com').origin : ''}
                    </div>
                  </div>
                </div>
                <img
                  src={screenshotSrc}
                  alt="Website preview"
                  className="w-full max-h-[400px] object-cover object-top"
                />
              </div>
            </div>
          ) : isLoading ? (
            <div className="px-6 pb-6">
              <Skeleton className="w-full h-64 rounded-xl" />
            </div>
          ) : (
            <div className="px-6 pb-6">
              <div className="w-full h-56 rounded-xl bg-muted flex flex-col items-center justify-center gap-2">
                <Globe className="w-12 h-12 text-muted-foreground/20" />
                <span className="text-xs text-muted-foreground">Preview loading…</span>
              </div>
            </div>
          )}
        </div>

        {/* Social Presence Infographic — 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="p-6">
            <SectionHeader icon={Users} title="Social Presence" badge={socialChannels.length > 0 ? `${socialChannels.length} channels` : undefined} />

            {socialChannels.length > 0 ? (
              <div className="space-y-3">
                {socialChannels.map((ch, i) => {
                  const config = PLATFORM_CONFIG[ch.platform] || { icon: Users, gradient: 'from-muted to-muted', label: ch.platform };
                  const Icon = config.icon;
                  return (
                    <a
                      key={i}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{config.label}</div>
                        {ch.username && (
                          <div className="text-xs text-muted-foreground truncate">@{ch.username}</div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No social channels detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 3: Insights Triptych + RSS
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Value Propositions */}
        {valueProps.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-6">
            <SectionHeader icon={Sparkles} title="Value Props" badge={valueProps.length} />
            <ul className="space-y-3">
              {valueProps.slice(0, 4).map((vp, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{vp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Opportunities */}
        {contentOpps.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-6">
            <SectionHeader icon={TrendingUp} title="Content Opps" badge={contentOpps.length} />
            <ul className="space-y-3">
              {contentOpps.slice(0, 4).map((co, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>{co}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* RSS Feeds */}
        <div className="rounded-2xl border border-border/40 bg-card p-6">
          <SectionHeader icon={Rss} title="Content Feeds" badge={rssFeeds.length > 0 ? rssFeeds.length : undefined} />
          {rssFeeds.length > 0 ? (
            <div className="space-y-3">
              {rssFeeds.slice(0, 5).map((feed, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-success flex-shrink-0 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{feed.title}</div>
                    <div className="text-[10px] text-muted-foreground">{feed.type}</div>
                  </div>
                  {feed.itemCount != null && (
                    <Badge variant="outline" className="border-border/40 text-muted-foreground text-[10px] flex-shrink-0">
                      {feed.itemCount} items
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Rss className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No feeds found</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 4: Image Gallery + Location Map
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Masonry Image Gallery — 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card p-6">
          <SectionHeader icon={ImageIcon} title="Website Imagery" badge={images.length > 0 ? `${images.length} found` : undefined} />
          {images.length > 0 ? (
            <div className="columns-2 md:columns-3 gap-3 space-y-3">
              {images.slice(0, 12).map((img, i) => (
                <div
                  key={i}
                  className="break-inside-avoid cursor-pointer group"
                  onClick={() => setSelectedImage(selectedImage === img ? null : img)}
                >
                  <div className="relative overflow-hidden rounded-xl border border-border/30">
                    <img
                      src={img}
                      alt=""
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="columns-2 md:columns-3 gap-3 space-y-3">
              {[80, 120, 100, 90, 140, 110].map((h, i) => (
                <div key={i} className="break-inside-avoid">
                  <Skeleton className="w-full rounded-xl" style={{ height: h }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No images captured</p>
            </div>
          )}
        </div>

        {/* Location Map — 1 col */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="p-6 pb-4">
            <SectionHeader icon={MapPin} title="Location" />
          </div>
          {crawlData?.location ? (
            <div className="relative">
              <iframe
                title="Location map"
                width="100%"
                height="300"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(crawlData.location)}&output=embed&z=11`}
              />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-card/95 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-foreground shadow-lg border border-border/40 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  {crawlData.location}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <Skeleton className="w-full h-[300px]" />
          ) : (
            <div className="w-full h-[300px] bg-muted flex flex-col items-center justify-center gap-3">
              <MapPin className="w-10 h-10 text-muted-foreground/20" />
              <span className="text-sm text-muted-foreground">No location detected</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Lightbox overlay for images
         ═══════════════════════════════════════════════ */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-full rounded-2xl shadow-2xl border border-border/20"
          />
        </div>
      )}
    </div>
  );
}
