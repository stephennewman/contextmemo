'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Handle,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  RefreshCw, 
  Building2, 
  Users, 
  BookOpen, 
  Star,
  Newspaper,
  Handshake,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'

// Entity types with their visual properties
const ENTITY_TYPES = {
  brand: { 
    color: '#0EA5E9', 
    bgColor: '#F0F9FF',
    icon: Building2, 
    label: 'Your Brand' 
  },
  competitor: { 
    color: '#EF4444', 
    bgColor: '#FEF2F2',
    icon: Users, 
    label: 'Competitor' 
  },
  resource: { 
    color: '#10B981', 
    bgColor: '#ECFDF5',
    icon: BookOpen, 
    label: 'Resource' 
  },
  aggregator: { 
    color: '#F59E0B', 
    bgColor: '#FFFBEB',
    icon: Star, 
    label: 'Aggregator' 
  },
  publisher: { 
    color: '#8B5CF6', 
    bgColor: '#F5F3FF',
    icon: Newspaper, 
    label: 'Publisher' 
  },
  partner: { 
    color: '#06B6D4', 
    bgColor: '#ECFEFF',
    icon: Handshake, 
    label: 'Partner' 
  },
} as const

type EntityType = keyof typeof ENTITY_TYPES

interface EntityData {
  id: string
  name: string
  domain?: string
  type: EntityType
  mentionCount: number
  citationCount: number
  winCount: number // queries where this entity is cited but brand isn't
  queries: string[] // sample queries where this entity appears
  isCenter?: boolean
  [key: string]: unknown // Index signature for ReactFlow compatibility
}

interface EntityMapProps {
  brandId: string
  brandName: string
}

// Custom node component for entities
function EntityNode({ data }: { data: EntityData & { isCenter?: boolean } }) {
  const typeConfig = ENTITY_TYPES[data.type]
  const Icon = typeConfig.icon
  const size = data.isCenter ? 120 : Math.min(100, 50 + data.mentionCount * 5)
  
  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-xl border-2 shadow-lg transition-all hover:shadow-xl cursor-pointer"
      style={{
        width: size,
        height: size,
        backgroundColor: typeConfig.bgColor,
        borderColor: typeConfig.color,
      }}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      
      <Icon 
        className="mb-1" 
        style={{ color: typeConfig.color }} 
        size={data.isCenter ? 28 : 20} 
      />
      <span 
        className="text-xs font-semibold text-center px-1 truncate w-full"
        style={{ color: typeConfig.color }}
      >
        {data.name.length > 12 ? data.name.slice(0, 12) + '...' : data.name}
      </span>
      
      {!data.isCenter && data.mentionCount > 0 && (
        <span 
          className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: typeConfig.color }}
        >
          {data.mentionCount > 99 ? '99+' : data.mentionCount}
        </span>
      )}
      
      {!data.isCenter && data.winCount > 0 && (
        <span 
          className="absolute -bottom-2 -right-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bg-red-500 text-white"
          title={`${data.winCount} queries where they win and you don't`}
        >
          {data.winCount}
        </span>
      )}
    </div>
  )
}

// Node types for ReactFlow
const nodeTypes = {
  entity: EntityNode,
}

export function EntityMap({ brandId, brandName }: EntityMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
  const [loading, setLoading] = useState(true)
  const [entities, setEntities] = useState<EntityData[]>([])
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null)

  // Fetch entity data
  const fetchEntities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/entities`)
      if (!response.ok) throw new Error('Failed to fetch entities')
      const data = await response.json()
      setEntities(data.entities || [])
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  // Build nodes and edges from entities
  useEffect(() => {
    if (entities.length === 0) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center node (the brand)
    const centerNode: Node = {
      id: 'brand-center',
      type: 'entity',
      position: { x: 400, y: 300 },
      data: {
        id: 'brand-center',
        name: brandName,
        type: 'brand' as EntityType,
        mentionCount: 0,
        citationCount: 0,
        winCount: 0,
        queries: [],
        isCenter: true,
      },
    }
    newNodes.push(centerNode)

    // Group entities by type
    const entityGroups: Record<EntityType, EntityData[]> = {
      brand: [],
      competitor: [],
      resource: [],
      aggregator: [],
      publisher: [],
      partner: [],
    }

    entities.forEach(entity => {
      if (entityGroups[entity.type]) {
        entityGroups[entity.type].push(entity)
      } else {
        entityGroups.competitor.push(entity) // default to competitor
      }
    })

    // Position entities in a radial layout by type
    // Each type gets a sector of the circle
    const typeAngles: Record<EntityType, number> = {
      brand: 0,
      competitor: -45,   // top-left area
      resource: 45,      // top-right area
      aggregator: 135,   // bottom-right
      publisher: 180,    // bottom
      partner: -135,     // bottom-left
    }

    const baseRadius = 280
    const radiusStep = 120 // Distance between rings

    Object.entries(entityGroups).forEach(([type, typeEntities]) => {
      if (type === 'brand' || typeEntities.length === 0) return

      const sortedEntities = typeEntities
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 12) // Allow up to 12 per type
      
      const entityCount = sortedEntities.length
      const baseAngle = (typeAngles[type as EntityType] * Math.PI) / 180
      
      // Dynamic angle spread based on entity count - more entities = wider spread
      const angleSpread = Math.min(Math.PI * 0.8, (Math.PI / 4) + (entityCount * 0.08))
      
      sortedEntities.forEach((entity, idx) => {
        // Distribute into rings: first 4 in inner ring, next 4 in middle, rest in outer
        const ring = Math.floor(idx / 4)
        const positionInRing = idx % 4
        const entitiesInThisRing = Math.min(4, entityCount - ring * 4)
        
        // Calculate angle within the ring
        const angleOffset = entitiesInThisRing > 1 
          ? (positionInRing - (entitiesInThisRing - 1) / 2) * (angleSpread / Math.max(entitiesInThisRing - 1, 1))
          : 0
        const angle = baseAngle + angleOffset
        const radius = baseRadius + ring * radiusStep
        
        const x = 400 + Math.cos(angle) * radius
        const y = 300 + Math.sin(angle) * radius

        const node: Node = {
          id: entity.id,
          type: 'entity',
          position: { x, y },
          data: { ...entity, isCenter: false },
        }
        newNodes.push(node)

        // Edge from center to entity
        const edgeColor = entity.winCount > 0 ? '#EF4444' : '#94A3B8'
        const edge: Edge = {
          id: `edge-${entity.id}`,
          source: 'brand-center',
          target: entity.id,
          type: 'default',
          animated: entity.winCount > 0,
          style: { 
            stroke: edgeColor, 
            strokeWidth: Math.min(3, 1 + entity.mentionCount / 10),
            opacity: 0.6,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
          },
        }
        newEdges.push(edge)
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [entities, brandName, setNodes, setEdges])

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id === 'brand-center') {
      setSelectedEntity(null)
    } else {
      setSelectedEntity(node.data as EntityData)
    }
  }, [])

  // Stats summary
  const stats = useMemo(() => {
    const competitors = entities.filter(e => e.type === 'competitor')
    const resources = entities.filter(e => e.type === 'resource')
    const totalWins = entities.reduce((sum, e) => sum + e.winCount, 0)
    return {
      totalEntities: entities.length,
      competitors: competitors.length,
      resources: resources.length,
      aggregators: entities.filter(e => e.type === 'aggregator').length,
      totalWins,
      topCompetitor: competitors.sort((a, b) => b.winCount - a.winCount)[0],
    }
  }, [entities])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-lg bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-muted-foreground">Loading entity map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8B5CF6]" />
            Entity Discovery Map
          </h2>
          <p className="text-sm text-muted-foreground">
            Entities discovered from AI responses to your prompts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEntities}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Entities</div>
          <div className="text-2xl font-bold">{stats.totalEntities}</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="text-xs text-muted-foreground">Competitors</div>
          <div className="text-2xl font-bold text-red-600">{stats.competitors}</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-green-500">
          <div className="text-xs text-muted-foreground">Resources</div>
          <div className="text-2xl font-bold text-green-600">{stats.resources}</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="text-xs text-muted-foreground">Aggregators</div>
          <div className="text-2xl font-bold text-amber-600">{stats.aggregators}</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="text-xs text-muted-foreground">Competitor Wins</div>
          <div className="text-2xl font-bold text-purple-600">{stats.totalWins}</div>
        </Card>
      </div>

      {/* Main visualization area */}
      <div className="grid grid-cols-3 gap-4">
        {/* ReactFlow canvas */}
        <div className="col-span-2 h-[500px] border rounded-lg overflow-hidden bg-slate-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E2E8F0" />
            <Controls showInteractive={false}>
              <button className="react-flow__controls-button">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button className="react-flow__controls-button">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button className="react-flow__controls-button">
                <Maximize2 className="h-4 w-4" />
              </button>
            </Controls>
            <MiniMap 
              nodeColor={(node) => {
                const data = node.data as EntityData | undefined
                const type = data?.type || 'competitor'
                return ENTITY_TYPES[type]?.color || '#94A3B8'
              }}
              maskColor="rgba(0,0,0,0.1)"
              className="bg-white border rounded"
            />
          </ReactFlow>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedEntity ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = ENTITY_TYPES[selectedEntity.type].icon
                    return <Icon className="h-5 w-5" style={{ color: ENTITY_TYPES[selectedEntity.type].color }} />
                  })()}
                  <CardTitle className="text-base">{selectedEntity.name}</CardTitle>
                </div>
                <CardDescription>
                  <Badge 
                    variant="outline" 
                    style={{ 
                      borderColor: ENTITY_TYPES[selectedEntity.type].color,
                      color: ENTITY_TYPES[selectedEntity.type].color,
                    }}
                  >
                    {ENTITY_TYPES[selectedEntity.type].label}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedEntity.domain && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Domain</div>
                    <a 
                      href={`https://${selectedEntity.domain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedEntity.domain}
                    </a>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-slate-50 rounded">
                    <div className="text-xs text-muted-foreground">Mentions</div>
                    <div className="text-lg font-bold">{selectedEntity.mentionCount}</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded">
                    <div className="text-xs text-muted-foreground">Wins vs You</div>
                    <div className="text-lg font-bold text-red-600">{selectedEntity.winCount}</div>
                  </div>
                </div>

                {selectedEntity.queries.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Sample Queries</div>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {selectedEntity.queries.slice(0, 5).map((query, idx) => (
                        <div key={idx} className="text-xs p-2 bg-slate-50 rounded truncate">
                          {query}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntity.type === 'competitor' && selectedEntity.winCount > 0 && (
                  <Button className="w-full" size="sm">
                    Analyze {selectedEntity.name}
                  </Button>
                )}
                
                {selectedEntity.type === 'aggregator' && (
                  <Button variant="outline" className="w-full" size="sm">
                    Check Listing Status
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entity Discovery</CardTitle>
                <CardDescription>
                  Click on any entity to see details
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-3">
                  This map shows all entities that AI mentions when answering prompts about your industry.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: ENTITY_TYPES.competitor.color }} />
                    <span>Competitors - Direct alternatives</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: ENTITY_TYPES.resource.color }} />
                    <span>Resources - Industry sites, gov</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: ENTITY_TYPES.aggregator.color }} />
                    <span>Aggregators - G2, Capterra</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: ENTITY_TYPES.publisher.color }} />
                    <span>Publishers - Blogs, news</span>
                  </div>
                </div>
                <p className="mt-4 text-xs">
                  <strong>Red edges</strong> indicate entities that win queries where you don&apos;t appear.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top threat card */}
          {stats.topCompetitor && stats.topCompetitor.winCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700">Top Threat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-semibold text-red-900">{stats.topCompetitor.name}</div>
                <div className="text-xs text-red-700">
                  Wins {stats.topCompetitor.winCount} queries where you&apos;re absent
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-2 text-xs text-muted-foreground">
        <span>Node size = mention frequency</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <div className="w-8 h-0.5 bg-red-500" /> Animated = competitor winning
        </span>
        <span>•</span>
        <span>Red badge = wins vs you</span>
      </div>
    </div>
  )
}
