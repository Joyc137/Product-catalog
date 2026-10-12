import { useCallback, useEffect, useState } from 'react'
import { isCancelled } from '../api/client'

/**
 * Runs `fetcher(signal)` whenever `deps` change, aborting the previous request
 * so a slow response can never overwrite a newer one. Previous data is kept
 * while reloading so lists don't flash empty between pages.
 */
export function useApi(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))

    fetcher(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (!isCancelled(error)) setState({ data: null, error, loading: false })
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
