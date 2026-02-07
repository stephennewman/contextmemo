import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BrandContext, TargetPersona, PersonaSeniority } from '@/lib/supabase/types'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

// Simple PATCH for updating disabled_personas list
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
  }
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const schema = z.object({
    disabled_personas: z.array(z.string()),
  })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'disabled_personas must be an array' }, { status: 400 })
  }

  const { disabled_personas } = parsed.data

  const context = (brand.context || {}) as BrandContext
  context.disabled_personas = disabled_personas

  const { error } = await supabase
    .from('brands')
    .update({ 
      context,
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId)

  if (error) {
    console.error('Failed to update personas:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    disabled_personas 
  })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
  }
  const supabase = await createClient()
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get brand
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const actionSchema = z.object({
    action: z.enum(['toggle_persona', 'add_persona', 'remove_persona', 'regenerate_personas']),
  })

  const body = await request.json().catch(() => null)
  const actionParsed = actionSchema.safeParse(body)

  if (!actionParsed.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { action } = actionParsed.data
  const context = (brand.context || {}) as BrandContext

  try {
    switch (action) {
      case 'toggle_persona': {
        // Toggle a persona on/off
        const toggleSchema = z.object({
          personaId: z.string().min(1),
          enabled: z.boolean(),
        })
        const toggleParsed = toggleSchema.safeParse(body)
        if (!toggleParsed.success) {
          return NextResponse.json({ error: 'personaId and enabled required' }, { status: 400 })
        }
        const { personaId, enabled } = toggleParsed.data
        if (!personaId) {
          return NextResponse.json({ error: 'personaId required' }, { status: 400 })
        }

        const disabledPersonas = context.disabled_personas || []
        
        if (enabled) {
          // Remove from disabled list
          const updated = disabledPersonas.filter(id => id !== personaId)
          context.disabled_personas = updated
        } else {
          // Add to disabled list
          if (!disabledPersonas.includes(personaId)) {
            context.disabled_personas = [...disabledPersonas, personaId]
          }
        }

        const { error } = await supabase
          .from('brands')
          .update({ 
            context,
            updated_at: new Date().toISOString()
          })
          .eq('id', brandId)

        if (error) throw error

        return NextResponse.json({ 
          success: true, 
          message: `Persona ${enabled ? 'enabled' : 'disabled'}`,
          disabled_personas: context.disabled_personas
        })
      }

      case 'add_persona': {
        // Add a new persona
        const addSchema = z.object({
          title: z.string().min(2),
          seniority: z.enum(['executive', 'manager', 'specialist']),
          function: z.string().min(2),
          description: z.string().min(5),
          phrasing_style: z.string().optional(),
          priorities: z.array(z.string()).optional(),
        })
        const addParsed = addSchema.safeParse(body)
        if (!addParsed.success) {
          return NextResponse.json({ error: 'title, function, and description are required' }, { status: 400 })
        }
        const { title, seniority, function: func, description, phrasing_style, priorities } = addParsed.data
        
        if (!title || !func || !description) {
          return NextResponse.json({ 
            error: 'title, function, and description are required' 
          }, { status: 400 })
        }

        // Validate seniority
        const validSeniorities: PersonaSeniority[] = ['executive', 'manager', 'specialist']
        if (!validSeniorities.includes(seniority)) {
          return NextResponse.json({ 
            error: 'seniority must be executive, manager, or specialist' 
          }, { status: 400 })
        }

        // Generate ID from title
        const id = title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50)

        // Check if persona ID already exists
        const existingPersona = context.personas?.find(p => p.id === id)
        if (existingPersona) {
          return NextResponse.json({ 
            error: 'A persona with this title already exists' 
          }, { status: 400 })
        }

        const newPersona: TargetPersona = {
          id,
          title,
          seniority,
          function: func,
          description,
          phrasing_style: phrasing_style || 'Direct and practical',
          priorities: priorities || [],
          detected_from: 'Manually added',
          is_auto_detected: false
        }

        // Add to personas array
        context.personas = [...(context.personas || []), newPersona]

        const { error } = await supabase
          .from('brands')
          .update({ 
            context,
            updated_at: new Date().toISOString()
          })
          .eq('id', brandId)

        if (error) throw error

        return NextResponse.json({ 
          success: true, 
          message: `Persona "${title}" added`,
          persona: newPersona
        })
      }

      case 'remove_persona': {
        // Remove a persona entirely
        const removeSchema = z.object({ personaId: z.string().min(1) })
        const removeParsed = removeSchema.safeParse(body)
        if (!removeParsed.success) {
          return NextResponse.json({ error: 'personaId required' }, { status: 400 })
        }
        const { personaId } = removeParsed.data
        if (!personaId) {
          return NextResponse.json({ error: 'personaId required' }, { status: 400 })
        }

        // Check if persona exists
        const persona = context.personas?.find(p => p.id === personaId)
        if (!persona) {
          return NextResponse.json({ 
            error: 'Persona not found' 
          }, { status: 404 })
        }

        // Don't allow removing auto-detected personas (use toggle instead)
        if (persona.is_auto_detected) {
          return NextResponse.json({ 
            error: 'Cannot remove auto-detected personas. Use toggle to disable instead.' 
          }, { status: 400 })
        }

        // Remove from personas
        context.personas = (context.personas || []).filter(p => p.id !== personaId)
        // Remove from disabled_personas if present
        context.disabled_personas = (context.disabled_personas || []).filter(id => id !== personaId)

        const { error } = await supabase
          .from('brands')
          .update({ 
            context,
            updated_at: new Date().toISOString()
          })
          .eq('id', brandId)

        if (error) throw error

        return NextResponse.json({ 
          success: true, 
          message: 'Persona removed'
        })
      }

      case 'regenerate_personas': {
        // Regenerate personas from existing context using AI
        if (!context.description && !context.products?.length) {
          return NextResponse.json({ 
            error: 'Not enough context data. Run a full context refresh first.' 
          }, { status: 400 })
        }

        const prompt = `Analyze this company information and identify the 2-3 primary buyer personas.

Company: ${context.company_name || brand.name}
Description: ${context.description || 'Not available'}
Products: ${(context.products || []).join(', ') || 'Not specified'}
Markets: ${(context.markets || []).join(', ') || 'Not specified'}
Features: ${(context.features || []).join(', ') || 'Not specified'}

For each persona, identify:
1. SENIORITY - Who has the budget/authority?
   - "executive" = C-level, VP, Director with budget authority
   - "manager" = Team leads, department managers
   - "specialist" = Individual contributors, entry-level

2. FUNCTION - What department/role? (Marketing, Sales, Operations, Training, IT, etc.)

Return exactly 2-3 personas as JSON:
[
  {
    "id": "snake_case_id",
    "title": "Job Title (e.g., VP of Learning & Development)",
    "seniority": "executive|manager|specialist",
    "function": "Department name",
    "description": "Who this persona is and what they do",
    "phrasing_style": "How they phrase AI questions",
    "priorities": ["What they care about"],
    "detected_from": "What signal indicated this persona",
    "is_auto_detected": true
  }
]

Be specific to this company's actual buyers. Return ONLY valid JSON array.`

        const { text } = await generateText({
          model: openai('gpt-4o'),
          prompt,
          temperature: 0.3,
        })

        let newPersonas: TargetPersona[] = []
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            newPersonas = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.error('Failed to parse personas:', text)
          return NextResponse.json({ 
            error: 'Failed to generate personas. Please try again.' 
          }, { status: 500 })
        }

        if (newPersonas.length === 0) {
          return NextResponse.json({ 
            error: 'No personas generated. Please try again.' 
          }, { status: 500 })
        }

        // Keep any manually added personas
        const manualPersonas = (context.personas || []).filter(p => !p.is_auto_detected)
        
        // Combine: new auto-detected + manual
        context.personas = [...newPersonas, ...manualPersonas]
        // Clear disabled list for auto-detected (user can re-disable)
        context.disabled_personas = (context.disabled_personas || []).filter(
          id => manualPersonas.some(p => p.id === id)
        )

        const { error } = await supabase
          .from('brands')
          .update({ 
            context,
            updated_at: new Date().toISOString()
          })
          .eq('id', brandId)

        if (error) throw error

        return NextResponse.json({ 
          success: true, 
          message: `Generated ${newPersonas.length} personas`,
          personas: context.personas
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Persona action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
