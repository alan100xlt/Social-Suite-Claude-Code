import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RecentPostsTable } from "@/components/dashboard/RecentPostsTable";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { TopPostSpotlight } from "@/components/dashboard/TopPostSpotlight";
import { TrendMetrics } from "@/components/dashboard/TrendMetrics";
import { UpcomingTimeline } from "@/components/dashboard/UpcomingTimeline";
import { OnboardingProgressWidget } from "@/components/dashboard/OnboardingProgressWidget";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Button } from "@/components/ui/button";
import { Plus, Users, Eye, TrendingUp, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
};

const Index = () => {
  const navigate = useNavigate();
  const stats = useDashboardStats();

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <DashboardLayout>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your social media command center.</p>
          </div>
          <Button className="gradient-accent shadow-glow hover:shadow-lg transition-shadow" onClick={() => navigate('/app/content?tab=posts')}>
            <Plus size={18} className="mr-2" />Create Post
          </Button>
        </motion.div>

        {/* Onboarding Progress Widget — conditional */}
        <motion.div variants={fadeUp}>
          <OnboardingProgressWidget />
        </motion.div>

        {/* KPI Stat Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Followers"
            value={stats.isLoading ? "—" : formatNumber(stats.totalFollowers)}
            icon={Users}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Total Reach"
            value={stats.isLoading ? "—" : formatNumber(stats.totalReach)}
            icon={Eye}
            iconColor="bg-accent/10 text-accent"
          />
          <StatCard
            title="Engagement Rate"
            value={stats.isLoading ? "—" : `${stats.avgEngagementRate.toFixed(2)}%`}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Posts (90d)"
            value={stats.isLoading ? "—" : formatNumber(stats.totalPosts)}
            icon={FileText}
            iconColor="bg-warning/10 text-warning"
          />
        </motion.div>

        {/* AI Daily Briefing */}
        <motion.div variants={fadeUp}>
          <DailyBriefing />
        </motion.div>

        {/* Highlights & Insights Row */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <TopPostSpotlight />
          <TrendMetrics />
        </motion.div>

        {/* Upcoming Timeline */}
        <motion.div variants={fadeUp}>
          <UpcomingTimeline />
        </motion.div>

        {/* Performance Chart + Recent Posts */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <EngagementChart />
          <RecentPostsTable />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
