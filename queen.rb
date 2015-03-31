require_relative 'sliding_piece.rb'

class Queen < Sliding_Piece

  DIRECTIONS = [
    [0,1],
    [0,-1],
    [1,0],
    [-1,0],
    [1,1],
    [1,-1],
    [-1,1],
    [-1,-1]
  ]

  def move_dirs
    DIRECTIONS
  end

  def render
    color == :white ? "\u2655" : "\u265B"
  end

end
