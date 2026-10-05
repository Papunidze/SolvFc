import { EA_WEB_APP_MATCHES } from '../ea/matches'
import { relaySolveRequests } from '../messaging'

export default defineContentScript({
  matches: EA_WEB_APP_MATCHES,
  main() {
    relaySolveRequests((request) => browser.runtime.sendMessage(request))
  },
})
