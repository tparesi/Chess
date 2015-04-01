require_relative 'board.rb'

class Game
  attr_accessor :board

  def initialize
    place_pieces = true
    @board = Board.new(Array.new(8){Array.new(8)}, place_pieces)
  end

  def play

    # check if game has been won
    loop do
      @board.display
      @board.move
    end

  end

end
