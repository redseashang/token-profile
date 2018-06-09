const fs = require('fs')
const PNG = require('pngjs').PNG


const dateExp = /^\d{4}-\d{2}(-\d{2})?$/

const urlExp = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/

const emailExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const isAddress = (address) => {
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    return false
  }
  return true
}

const isStringWithCharacter = (str) => {
  return str && typeof str === 'string' && str.trim()
}

const isUrl = (url) => isStringWithCharacter(url) && url.match(urlExp)

const exitWithMsg = (msg) => {
  console.log(msg)
  process.exit(1)
}

const jsonFileNames = fs.readdirSync('./erc20')
const imageFileNames = fs.readdirSync('./images')
const imageAddrs = imageFileNames.map(n => n.toLowerCase().slice(0, 42)).filter(n => n.startsWith('0x'))

jsonFileNames
  .filter(jsonFileName => {
    return jsonFileName !== '$template.json' && jsonFileName.endsWith('.json')
  })
  .forEach(jsonFileName => {
    const addr = jsonFileName.replace('.json', '')
    if (!isAddress(addr)) {
      exitWithMsg(`commit-msg: ERROR! json file name ${jsonFileName} is not like a address.json`)
    }

    const content = fs.readFileSync(`./erc20/${addr}.json`).toString()
    let obj = null
    let parseErr = null

    try {
      obj = JSON.parse(content)
    } catch (e) {
      parseErr = e
    }

    // try to format first
    if (parseErr) {
      try {
        contentConverted = content.replace(/\s+/g, '').replace(/,\}/g, '}')
        obj = JSON.parse(contentConverted)
        fs.writeFileSync(`./erc20/${addr}.json`, JSON.stringify(obj, null, 4))
      } catch (e) {
        parseErr = e
      }
    }

    if (parseErr) {
      exitWithMsg(`commit-msg: ERROR! json file name ${jsonFileName} parse error, please check first`)
    }

    if (!imageAddrs.includes(addr.toLowerCase())) {
      exitWithMsg(`commit-msg: ERROR! dose not have ${addr + '.png'} in images dir, please check first`) 
    }

    if (!obj.symbol) {
      exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName} content must have symbol field`)
    }

    if (!obj.address) {
      exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName} content must have address field`)
    }

    if (!isAddress(obj.address)) {
      exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName} address field must be an ethereum address`)
    }

    if (obj.address.toLowerCase() !== addr.toLowerCase()) {
      exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName} should be the same with address field ${obj.address}`)
    }

    if (obj.published_on !== undefined) {
      if (obj.published_on.search(dateExp) === -1) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s published_on field ${obj.published_on} must be format of YYYY-MM-DD or YYYY-MM-DD`)
      }
    }

    if (obj.email !== undefined) {
      if (obj.email.search(emailExp) === -1) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s email field ${obj.email} must be an email`)
      }
    }

    if (obj.overview !== undefined) {
      if (!['zh', 'en'].every(isStringWithCharacter)) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s overview field must have zh and en field, and must be a string (not empty)`)
      }
    }
  
    if (obj.links !== undefined) {
      if (!Object.keys(obj.links).every(k => isUrl(obj.links[k]))) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s links every field must be an url`)
      }
    }

    if (obj.state !== undefined) {
      if (!['LOCKED', 'NORMAL'].includes(obj.state)) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s state field ${obj.state} must be 'LOCKED' or 'NORMAL'`)
      }
    }

    if (obj.initial_price !== undefined) {
      const keys = Object.keys(obj.initial_price)
      if (keys.some(k => !['BTC', 'ETH', 'USD'].includes(k))) {
        exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s initial_price field ${JSON.stringify(obj.initial_price)} only support BTC ETH USD`)
      }

      keys.forEach(k => {
        if (!obj.initial_price[k].endsWith(k)) {
          exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s initial_price field ${obj.initial_price[k]} must end with ${'space+' + k}, just see example`)
        }
      })
    }

    ['website', 'whitepaper'].forEach(k => {
      if (obj[k] !== undefined) {
        if (!isUrl(obj[k])) {
          exitWithMsg(`commit-msg: ERROR! json file ${jsonFileName}'s ${k} field ${obj[k]} must an url`)
        }
      }
    })
  })

imageFileNames.forEach(n => {
  const path = `./images/${n}`
  
  fs.createReadStream(path)
    .pipe(new PNG()).on('metadata', (metadata) => {
      if (metadata.width !== metadata.height) {
        exitWithMsg(`${n} image width ${metadata.width} !== height ${metadata.height}`)
      }
      if (metadata.width !== 120 || metadata.height !== 80) {
        exitWithMsg(`${n} image width and height ${metadata.width} must be 80px or 120px`)
      }
      if (!metadata.alpha) {
        exitWithMsg(`${n} image must have transparent background`)
      }
    }).on('error', (err) => {
      exitWithMsg(`${n} image parse error ${err.message}`)
    })

})

// process.exit(0)