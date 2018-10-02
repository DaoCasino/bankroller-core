const apps = []
const privateKeys = [
  '0x45D090A0CA46A6BD3DF07923FBEB6631B1C257112E0047C2140B0D2FA5039C89',
  '0x071ae6cf5f4271d1b0a97121e1531514a6aabb056fe1fe221dd1288a9cc2a7c9',
  '0xdfdbef93c044fde06ad3d3887417466bf38473caa33bb4516b61d7d912994092'
]

const base = {
  name             : 'B_stage',
  script           : 'npm',
  args             : 'run start:ropsten',

  max_memory_restart : '100M',
  autorestart        : true,
  restart_delay      : 3000,
  min_uptime         : 7777
}

for (let key of privateKeys) {
  apps.push({
    name   : `B_stage_dice_${privateKeys.indexOf(key) + 1}`,
    script : 'npm',
    args   : 'run start:ropsten',
    env: {
      PRIVATE_KEY: key
    },

    max_memory_restart : '100M',
    autorestart        : true,
    restart_delay      : 3000,
    min_uptime         : 7777
  })
}

module.exports = {
  apps : apps
}
