class GlobalGameLogicStore {
  /**
   * Define DApp logic constructor function
   * @param {string} dapp_slug         unique slug of your dapp
   * @param {function} logic_constructor constructor Dapp logic
   */
  defineDAppLogic(dapp_slug, logic_constructor) {
    global["DAppsLogic"] = global["DAppsLogic"] || {};
    global["DAppsLogic"][dapp_slug] = logic_constructor;
  }
}
