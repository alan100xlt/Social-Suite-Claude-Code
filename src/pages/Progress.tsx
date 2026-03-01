import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock, Rocket, Users, Zap } from 'lucide-react';

interface Ticket {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  completedAt?: string;
}

export default function Progress() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'a728ffab-5a85-4fad-934b-6fe773d39655',
      identifier: 'SOC-7',
      title: 'Fix Invite Link URL Routing',
      status: 'completed',
      priority: 'urgent'
    },
    {
      id: '39045757-b4ea-4b69-801e-b436a3ef95ac',
      identifier: 'SOC-8',
      title: 'Instant Signup from Discovery Flow',
      status: 'completed',
      priority: 'urgent'
    },
    {
      id: '61e822b3-3c06-4a38-96ee-6033eee7feb8',
      identifier: 'SOC-9',
      title: 'Optimal Posting Time Analysis',
      status: 'backlog',
      priority: 'high'
    },
    {
      id: '451ff9bd-c4b8-44a2-b993-94d0780bff48',
      identifier: 'SOC-10',
      title: 'Media Company Hierarchy',
      status: 'backlog',
      priority: 'high'
    },
    {
      id: 'e3ce003c-cab7-4b93-99ef-bc954e472430',
      identifier: 'SOC-6',
      title: 'Phase 1: Codebase Cleanup & Consolidation',
      status: 'backlog',
      priority: 'urgent'
    }
  ]);

  const completedCount = tickets.filter(t => t.status === 'completed').length;
  const totalCount = tickets.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Development Progress</h1>
        <p className="text-muted-foreground">
          Real-time tracking of Social Suite autonomous development
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Overall Progress
          </CardTitle>
          <CardDescription>
            {completedCount} of {totalCount} features completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="mb-4" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progressPercent.toFixed(0)}% Complete</span>
            <span>{completedCount} features shipped</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Latest Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">✅ Fixed invite link routing</p>
                <p className="text-sm text-muted-foreground">Invited users now land on correct signup page</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">✅ Eliminated discovery flow dead-end</p>
                <p className="text-sm text-muted-foreground">Users get instant access with no "check email" step</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">🎯 Next: Optimal Posting Time Analysis</p>
                <p className="text-sm text-muted-foreground">AI-powered scheduling based on engagement data</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Feature Queue
          </CardTitle>
          <CardDescription>
            All development tickets from your PRD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(ticket.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {ticket.identifier}
                      </span>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{ticket.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground capitalize">
                    {ticket.status.replace('-', ' ')}
                  </p>
                  {ticket.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          View detailed progress in Linear:
        </p>
        <a
          href="https://linear.app/social-suite-cc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          linear.app/social-suite-cc
        </a>
      </div>
    </div>
  );
}
