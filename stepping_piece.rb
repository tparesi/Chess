require_relative 'piece.rb'

class Stepping_Piece < Piece

  def moves
    move_dirs.map { |dx, dy| [x + dx, y + dy] }
             .reject { |pos| not(in_bounds?(pos)) }
  end


  def move_dirs
    raise NotImplementedError.new "Subclass of sliding piece must override move_dirs."
  end

end
