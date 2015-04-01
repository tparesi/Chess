require_relative 'piece.rb'

class Pawn < Piece
  attr_accessor :first_move

  def initialize(pos, color, board, first_move = true)
    @first_move = first_move
    super(pos, color, board)
  end

  def moves
    possible_moves = [base_moves]
    possible_moves << first_moves if first_move
    possible_moves + attack_moves
  end

  def base_moves
    [pos.first + dy, pos.last]
  end

  def attack_moves
    diag1 = [x + dy, y - 1]
    diag2 = [x + dy, y + 1]
    attacks = []

    attacks << diag1 if (@board[diag1] && opponent?(@board[diag1]))
    attacks << diag2 if (@board[diag2] && opponent?(@board[diag2]))

    attacks
  end

  def first_moves
    [pos.first + 2 * dy, pos.last]
  end

  def dy
    color == :white ? -1 : 1
  end

  def render
    color == :white ? "\u2659" : "\u265F"
  end

end
