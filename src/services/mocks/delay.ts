export function simulateNetworkDelay(duration = 250) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}
