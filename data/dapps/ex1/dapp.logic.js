module.exports = function() {
  return {
    play: function(userBet, gameData, randoms) {
      const userNum = gameData[0]
      const randomNum = randoms[0]

      let profit = -userBet
      for(let i in randoms){
        if (gameData[i]==randoms[i]) {
          profit += userBet*2
        }
      }

      // return player profit
      return profit
    }
  }
}
