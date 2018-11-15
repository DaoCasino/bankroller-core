module.exports = function () {
  return {
    play: function (userBet, gameData, randoms) {
      const userNum = gameData[0]
      const randomNum = randoms[0]
      const houseedge = 0.02
      const maxRandomNum = 65535

      let profit = -userBet

      if (userNum >= randomNum) {
        profit = (userBet * (maxRandomNum - maxRandomNum * houseedge) / userNum) - userBet
      }

      return profit
    }
  }
}
