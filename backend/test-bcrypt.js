const bcrypt = require('bcrypt');

   const password = 'admin123';
   const storedHash = '$2b$10$6z0kZ4b3g6j8k9m2n3p4q.r5s6t7u8v9w0x1y2z3A4B5C6D7E8F9G';

   bcrypt.compare(password, storedHash, (err, isMatch) => {
       if (err) {
           console.error('Error:', err);
       } else {
           console.log('Password match:', isMatch);
       }
   });

   // Generate new hash for verification
   bcrypt.hash(password, 10, (err, hash) => {
       if (err) {
           console.error('Hash error:', err);
       } else {
           console.log('New hash:', hash);
       }
   });