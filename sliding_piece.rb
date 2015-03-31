require_relative 'piece.rb'

class Sliding_Piece < Piece

  def moves
    positions = []
    move_dirs.each do |dx, dy|

      mult = 1
      while in_bounds?([x + mult * dx, y + mult * dy])
        positions << [x + mult*dx, y + mult*dy]
        mult += 1
      end
    end

    positions
  end


  def move_dirs
    raise NotImplementedError.new "Subclass of sliding piece must override move_dirs."
  end

end
