require_relative 'board.rb'

class Game
  attr_accessor :board

  def initialize
    place_pieces = true
    @board = Board.new(Array.new(8){Array.new(8)}, place_pieces)
    play
  end

  def play

    player = :white
    until ended_in_checkmate?|| ended_in_stalemate?
      puts "\n#{player.to_s.capitalize}'s turn."
      @board.display
      @board.move(player)
      player == :white ? player = :black : player = :white
    end

    display_winner(player)
  end

  def display_winner(player)
    if ended_in_checkmate?
      puts "\nCheckmate! #{player.to_s.capitalize} loses."
    elsif ended_in_stalemate?
      puts "\nStalemate! Nobody wins."
    end
  end

  def ended_in_stalemate?
    @board.stalemate?(:white) || @board.stalemate?(:black)
  end

  def ended_in_checkmate?
    @board.checkmate?(:white) || @board.checkmate?(:black)
  end

end
