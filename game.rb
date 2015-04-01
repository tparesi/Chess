require_relative 'board.rb'
require_relative 'human_player.rb'

class Game
  attr_accessor :board

  COL = {
    "A" => 0,
    "B" => 1,
    "C" => 2,
    "D" => 3,
    "E" => 4,
    "F" => 5,
    "G" => 6,
    "H" => 7
  }

  def initialize(player1, player2)
    @player1, @player2 = player1, player2
    @board = Board.new
    play
  end

  def play
    player = @player1

    until ended_in_checkmate?|| ended_in_stalemate?
      puts "\n#{player.name.capitalize}'s turn."
      @board.display
      start_pos, end_pos = handle_input(player.color)
      @board.move(player.color, start_pos, end_pos)
      player == @player1 ? player = @player2 : player = @player1
    end

    @board.display
    display_winner(player)
  end

  def display_winner(player)
    if ended_in_checkmate?
      puts "\nCheckmate! #{player.name.capitalize} loses."
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

private

  def handle_input(color)
    begin
      start_pos, end_pos = get_move
      piece = @board[start_pos]

      report_illegal_move(piece, end_pos, color)
    rescue IOError => e
      puts e.message
      retry
    end

    [start_pos, end_pos]
  end

  def get_move
    puts "Where do you want to move from?"
    coords = gets.chomp.split("")
    start_pos = [coords.last.to_i - 1, COL[coords.first.upcase]]

    puts "Where do you want to move to?"
    coords = gets.chomp.split("")
    end_pos = [coords.last.to_i - 1, COL[coords.first.upcase]]

    [start_pos, end_pos]
  end

  def report_illegal_move(piece, end_pos, player_color)
    raise IOError.new "There's no piece there!\n" unless piece

    unless piece.valid_moves.include?(end_pos)
      raise IOError.new "That's not a valid move for the piece you chose.\n"
    end

    unless piece.color == player_color
      raise IOError.new "That's your opponent's piece.\n"
    end
  end
end


if __FILE__ == $PROGRAM_NAME
  puts "Who is playing white?"
  name = gets.chomp
  player1 = HumanPlayer.new(name, :white)

  puts "Who is playing black?"
  name = gets.chomp
  player2 = HumanPlayer.new(name, :black)

  Game.new(player1, player2)
end
