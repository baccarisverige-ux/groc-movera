import { describe, expect, it } from 'vitest'
import {
  HOST_MENU_VIEWS,
  HOST_PRIMARY_NAV,
  HOST_WORKSPACE_VIEWS,
  hostMenuItems,
  hostNavViewFor,
  hostPrimaryNavItems,
  hostWorkspaceViewFromPath,
} from '../../src/features/host/workspace/hostWorkspaceModel.js'

describe('host navigation', () => {
  /* A bottom bar stops being a bar somewhere around five items. The rail
     carried seven, scrolled sideways, and clipped its last tab at 390px. */
  it('keeps the bottom bar at five tabs', () => {
    expect(HOST_PRIMARY_NAV).toHaveLength(5)
    expect(hostPrimaryNavItems().map((item) => item.id)).toEqual(HOST_PRIMARY_NAV)
    expect(hostPrimaryNavItems().every((item) => item.label && item.path)).toBe(true)
  })

  /* Nothing may fall out of reach: every destination is either a tab or a row
     under Menu. Dropping a view from both lists would leave a route the host
     can reach only by typing the URL. */
  it('reaches every workspace view from the bar or the menu', () => {
    const reachable = new Set([...HOST_PRIMARY_NAV, ...HOST_MENU_VIEWS])
    for (const view of HOST_WORKSPACE_VIEWS) {
      expect(reachable.has(view.id)).toBe(true)
    }
    expect(hostMenuItems().map((item) => item.id)).toEqual(HOST_MENU_VIEWS)
  })

  it('never lists the same destination twice', () => {
    const all = [...HOST_PRIMARY_NAV, ...HOST_MENU_VIEWS]
    expect(new Set(all).size).toBe(all.length)
  })

  it('routes each host path to its view', () => {
    for (const view of HOST_WORKSPACE_VIEWS) {
      expect(hostWorkspaceViewFromPath(view.path)).toBe(view.id)
    }
    expect(hostWorkspaceViewFromPath('/groc-movera/host/listings/editor')).toBe('listing-editor')
    expect(hostWorkspaceViewFromPath('/groc-movera/host')).toBe('dashboard')
  })

  /* The editor is a detail screen of Annonces, not a tab: it lights the tab
     the host came from, which is also where Back returns them. */
  it('lights Annonces while the editor is open', () => {
    expect(hostNavViewFor('listing-editor')).toBe('listings')
    expect(hostNavViewFor('calendar')).toBe('calendar')
  })
})
