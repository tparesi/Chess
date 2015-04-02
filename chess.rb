require_relative 'board.rb'
require_relative 'human_player.rb'
require_relative 'computer_player.rb'
require 'yaml'

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

    puts "Your game will be saved after each turn."
    puts "To load an in-progress game, run:"
    puts "ruby chess.rb chess-#{@player1.name}-v-#{@player2.name}.yml"

    until ended_in_checkmate?|| ended_in_stalemate? || draw?
      puts "\n#{player.name.capitalize}'s turn."
      @board.display

      if player.is_a?(HumanPlayer)
        start_pos, end_pos = handle_input(player.color)
      elsif player.is_a?(ComputerPlayer)
        start_pos, end_pos = player.generate_move(@board)
      end

      @board.move(player.color, start_pos, end_pos)
      player == @player1 ? player = @player2 : player = @player1
      save
    end

    @board.display
    display_winner(player)
  end

private

  def save
    File.write("chess-#{@player1.name}-v-#{@player2.name}.yml", YAML.dump(self))
  end

  def display_winner(player)
    if ended_in_checkmate?
      puts "\nCheckmate! #{player.name.capitalize} loses."
    elsif ended_in_stalemate?
      puts "\nStalemate! Nobody wins."
    elsif draw?
      puts "\nDraw! Nobody wins."
    end
  end

  def draw?
    @board.moves_since_pawn >= 50
  end

  def ended_in_stalemate?
    @board.stalemate?(:white) || @board.stalemate?(:black)
  end

  def ended_in_checkmate?
    @board.checkmate?(:white) || @board.checkmate?(:black)
  end

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
    begin
      puts "Where do you want to move from?"
      coords = gets.chomp.split("")
      raise IOError.new "Please enter a letter followed by a number" if coords.empty?
      start_pos = [coords.last.to_i - 1, COL[coords.first.upcase]]

      puts "Where do you want to move to?"
      coords = gets.chomp.split("")
      raise IOError.new "Please enter a letter followed by a number" if coords.empty?
      end_pos = [coords.last.to_i - 1, COL[coords.first.upcase]]
    rescue IOError => e
      puts e
      retry
    end
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

  unless ARGV.empty?
    YAML.load_file(ARGV.shift).play
  else
    puts "Who is playing white?"
    name = gets.chomp
    player1 = ComputerPlayer.new(name, :white)

    puts "Who is playing black?"
    name = gets.chomp
    player2 = ComputerPlayer.new(name, :black)

    Game.new(player1, player2)
  end
end
