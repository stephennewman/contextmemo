import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BrandContext, CustomPersona, PromptPersona, PERSONA_CONFIGS } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
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

  const body = await request.json()
  const { action } = body
  const context = (brand.context || {}) as BrandContext

  try {
    switch (action) {
      case 'toggle_persona': {
        // Toggle a persona on/off
        const { personaId, enabled } = body
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
        // Add a custom persona
        const { id, name, description, phrasing_style, priorities } = body
        
        if (!id || !name || !description) {
          return NextResponse.json({ 
            error: 'id, name, and description are required' 
          }, { status: 400 })
        }

        // Validate ID format (snake_case)
        const idRegex = /^[a-z][a-z0-9_]*$/
        if (!idRegex.test(id)) {
          return NextResponse.json({ 
            error: 'ID must be lowercase letters, numbers, and underscores (e.g., restaurant_owner)' 
          }, { status: 400 })
        }

        // Check if persona ID already exists
        const existingCore = PERSONA_CONFIGS.find(p => p.id === id)
        const existingCustom = context.custom_personas?.find(p => p.id === id)
        if (existingCore || existingCustom) {
          return NextResponse.json({ 
            error: 'A persona with this ID already exists' 
          }, { status: 400 })
        }

        const newPersona: CustomPersona = {
          id,
          name,
          description,
          phrasing_style: phrasing_style || 'Direct and practical',
          priorities: priorities || [],
          detected_from: 'Manually added'
        }

        // Add to custom_personas and target_personas
        context.custom_personas = [...(context.custom_personas || []), newPersona]
        context.target_personas = [...(context.target_personas || []), id]

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
          message: `Persona "${name}" added`,
          persona: newPersona
        })
      }

      case 'remove_persona': {
        // Remove a custom persona entirely
        const { personaId } = body
        if (!personaId) {
          return NextResponse.json({ error: 'personaId required' }, { status: 400 })
        }

        // Can only remove custom personas, not core ones
        const isCore = PERSONA_CONFIGS.find(p => p.id === personaId)
        if (isCore) {
          return NextResponse.json({ 
            error: 'Cannot remove core personas. Use toggle to disable instead.' 
          }, { status: 400 })
        }

        // Remove from custom_personas
        context.custom_personas = (context.custom_personas || []).filter(p => p.id !== personaId)
        // Remove from target_personas
        context.target_personas = (context.target_personas || []).filter(id => id !== personaId)
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

      case 'add_core_persona': {
        // Add a core persona to target_personas
        const { personaId } = body
        if (!personaId) {
          return NextResponse.json({ error: 'personaId required' }, { status: 400 })
        }

        const corePersona = PERSONA_CONFIGS.find(p => p.id === personaId)
        if (!corePersona) {
          return NextResponse.json({ error: 'Invalid core persona' }, { status: 400 })
        }

        // Add to target_personas if not already there
        const targetPersonas = context.target_personas || []
        if (!targetPersonas.includes(personaId)) {
          context.target_personas = [...targetPersonas, personaId]
        }

        // Remove from disabled if it was disabled
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
          message: `${corePersona.name} added`
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
