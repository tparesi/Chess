require_relative 'sliding_piece.rb'

class Rook < Sliding_Piece

  DIRECTIONS = [
    [0,1],
    [0,-1],
    [1,0],
    [-1,0]
  ]

  def move_dirs
    DIRECTIONS
  end

end
