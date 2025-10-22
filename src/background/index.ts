console.log('background is running')

chrome.runtime.onMessage.addListener((request) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.type === 'COUNT') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log('background has received a message from popup, and count is ', request?.count)
  }
})
