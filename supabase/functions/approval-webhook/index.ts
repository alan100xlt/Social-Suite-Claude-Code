import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApprovalRequest {
  ticketId: string
  question: string
  options: string[]
  impact?: string
  deadline?: string
  priority: 'urgent' | 'standard' | 'major'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ticketId, question, options, impact, deadline, priority }: ApprovalRequest = await req.json()

    // Create approval record in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: approval, error } = await supabase
      .from('approval_requests')
      .insert({
        ticket_id: ticketId,
        question,
        options,
        impact,
        deadline,
        priority,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Send notification (you can integrate with Slack, email, etc.)
    await sendNotification(approval)

    return new Response(
      JSON.stringify({ 
        success: true, 
        approvalId: approval.id,
        message: 'Approval request sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function sendNotification(approval: any) {
  // Integration point for:
  // - Slack webhook
  // - Email notification  
  // - Linear comment
  // - SMS (if urgent)
  
  console.log('Approval request created:', approval)
}
