const instances = 3 

let base = {
  name             : 'B_prod',
  exec_interpreter : 'babel-node',
  script           : './server.js',
  
  max_memory_restart : '100M',
  autorestart        : true,
  restart_delay      : 3000,
  min_uptime         : 7777,

  env: {
    DC_NETWORK   : 'ropsten',
    DATA_SUBPATH : 'B_prod',
    NODE_ENV     : 'production'
  }
}

let apps = []

for (let i = 1; i <= instances; i++) {
  apps.push(JSON.parse(JSON.stringify(Object.assign(base, {
    name : 'B_prod_' + i,
    env  : Object.assign(base.env, {
      DATA_SUBPATH : 'B_prod_' + i
    })
  }))))
}

module.exports = {
  apps : apps
}
