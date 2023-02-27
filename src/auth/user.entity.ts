import { Task } from '../tasks/task.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @OneToMany((_type) => Task, (task) => task.user)
  tasks: Task[];

  @OneToMany((_type) => Project, (project) => project.admin)
  projects: Project[];
}
