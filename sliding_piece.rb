require_relative 'piece.rb'

class Sliding_Piece < Piece

  def moves
    positions = []
    move_dirs.each do |dx, dy|

      mult = 1
      new_pos = [x + mult * dx, y + mult * dy]

      while in_bounds?(new_pos)
        positions << new_pos
        mult += 1
        new_pos = [x + mult * dx, y + mult * dy]
      end
    end

    positions
  end


  def move_dirs
    raise NotImplementedError.new "Subclass of sliding piece must override move_dirs."
  end

end
