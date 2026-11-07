export interface ContentTopic {
  id: string
  name: string
  slug: string
  description: string
  source_type: 'system' | 'custom'
  is_active: boolean
  priority: number
  last_selected_at: string | null
}

export interface TopicUsageRecord {
  topic_id: string | null
  topic: string
  used_at: string
}
